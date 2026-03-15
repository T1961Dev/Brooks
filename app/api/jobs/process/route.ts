import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  getApifyRunStatus,
  getApifyDatasetItems,
  type ApifyDatasetItem,
} from "@/lib/integrations/apify";
import { setJobStepStatus, updateJob } from "@/lib/jobs/orchestrator";
import { dedupeLeads } from "@/lib/leads/dedupe";
import { verifyEmails } from "@/lib/leads/verification";
import { enrichFromApify } from "@/lib/leads/enrich";
import {
  pushLeadsToExistingCampaign,
  resolveInstantlyApiKey,
} from "@/lib/integrations/instantly";

const COUNTRY_ALIASES: Record<string, string> = {
  us: "united states",
  usa: "united states",
  uk: "united kingdom",
  gb: "united kingdom",
};

function normalizeCountry(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  return COUNTRY_ALIASES[normalized] ?? normalized;
}

function textIncludesAny(haystack: string, needles: string[]): boolean {
  if (!needles.length) return true;
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseBoundaryMatch(haystack: string, phrase: string): boolean {
  const p = phrase.trim().toLowerCase();
  if (!p) return false;
  const pattern = new RegExp(`\\b${escapeRegex(p)}\\b`, "i");
  return pattern.test(haystack);
}

function countPhraseMatches(haystack: string, phrases: string[]): number {
  let score = 0;
  for (const phrase of phrases) {
    if (phraseBoundaryMatch(haystack, phrase)) score++;
  }
  return score;
}

type RelevanceInput = {
  selectedIndustries: string[];
  selectedKeywords: string[];
  industry: string;
  searchableText: string;
  technologies: string;
};

function computeRelevanceScore(input: RelevanceInput): number {
  const {
    selectedIndustries,
    selectedKeywords,
    industry,
    searchableText,
    technologies,
  } = input;

  let score = 0;

  // Direct signal from selected industries (strongest indicator).
  if (
    selectedIndustries.length > 0 &&
    selectedIndustries.some((value) => industry.includes(value))
  ) {
    score += 40;
  }

  // Reward explicit keyword hits in company text.
  const keywordHits = countPhraseMatches(searchableText, selectedKeywords);
  score += Math.min(30, keywordHits * 8);

  // B2B SaaS intent signals.
  const saasSignals = [
    "saas",
    "software as a service",
    "b2b",
    "enterprise software",
    "crm",
    "platform",
    "api",
    "subscription",
  ];
  const saasSignalHits = countPhraseMatches(searchableText, saasSignals);
  score += Math.min(20, saasSignalHits * 4);

  // Technology footprint often correlates with software companies.
  if (technologies.length > 0) {
    score += 5;
  }

  // Down-rank obvious non-target/consumer-heavy company profiles.
  const negativeSignals = [
    "restaurant",
    "hospitality",
    "consumer goods",
    "retail store",
    "food & beverages",
    "staffing",
    "law practice",
  ];
  const negativeHits = countPhraseMatches(searchableText, negativeSignals);
  score -= Math.min(20, negativeHits * 5);

  return Math.max(0, Math.min(100, score));
}

function titleMatches(selectedTitles: string[], leadTitle?: string | null): boolean {
  if (!selectedTitles.length) return true;
  const title = (leadTitle ?? "").toLowerCase().trim();
  if (!title) return false;
  return selectedTitles.some((selected) => {
    const s = selected.toLowerCase().trim();
    if (!s) return false;

    if (s === "ceo") {
      return /\bceo\b/i.test(title) || /\bchief executive officer\b/i.test(title);
    }
    if (s === "founder") {
      return /\bfounder\b/i.test(title);
    }
    if (s === "managing director") {
      return /\bmanaging director\b/i.test(title);
    }
    if (s === "owner") {
      // "Owner" should not accidentally include Product Owner-style roles.
      if (/\bproduct owner\b/i.test(title)) return false;
      return /\bowner\b/i.test(title) || /\bco[- ]owner\b/i.test(title);
    }

    return phraseBoundaryMatch(title, s);
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const jobId = (body.jobId as string | undefined)?.trim();
  if (!jobId)
    return NextResponse.json({ error: "jobId required" }, { status: 400 });

  /* ---- Load job ---- */
  const { data: job } = await supabase
    .from("lead_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: icp } = await supabase
    .from("icp_profiles")
    .select("job_titles, industries, industry_keywords, geography")
    .eq("id", job.icp_id)
    .eq("user_id", user.id)
    .single();

  if (!icp) {
    return NextResponse.json({ error: "ICP not found for job" }, { status: 404 });
  }

  if (job.status === "succeeded") {
    return NextResponse.json({ job, status: "succeeded" });
  }

  if (!job.apify_run_id) {
    return NextResponse.json(
      { error: "Job missing apify_run_id" },
      { status: 400 }
    );
  }

  /* ---- Check Apify status ---- */
  let datasetId = job.apify_dataset_id as string | undefined;
  if (!datasetId) {
    const status = await getApifyRunStatus(job.apify_run_id);
    if (status.status === "RUNNING") {
      await updateJob(supabase, jobId, {
        progress_step: "scrape",
        progress_percent: 30,
      });
      return NextResponse.json({ job, status: "running" });
    }

    if (status.status === "FAILED") {
      await setJobStepStatus(supabase, jobId, "scrape", "failed", {
        error: "Apify run failed",
      });
      await updateJob(supabase, jobId, {
        status: "failed",
        error: "Apify run failed",
        finished_at: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Apify run failed" },
        { status: 500 }
      );
    }

    if (!status.datasetId) {
      return NextResponse.json(
        { error: "No datasetId returned" },
        { status: 500 }
      );
    }
    datasetId = status.datasetId;
  }

  /* ---- Scrape succeeded ---- */
  await setJobStepStatus(supabase, jobId, "scrape", "succeeded");
  await updateJob(supabase, jobId, {
    apify_dataset_id: datasetId,
    progress_step: "verify",
    progress_percent: 35,
  });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /* ---- Fetch dataset items ---- */
  const items = await getApifyDatasetItems(datasetId);
  const requestedCap = Math.max(0, job.requested_lead_count ?? 9999);
  const processingLimit = Math.min(items.length, requestedCap);
  const batch: ApifyDatasetItem[] = items.slice(0, processingLimit);

  /* ---- Handle empty datasets ---- */
  if (items.length === 0) {
    await setJobStepStatus(supabase, jobId, "scrape", "failed", {
      error: "Apify returned 0 items in dataset",
    });
    await updateJob(supabase, jobId, {
      status: "failed",
      error: "Apify returned 0 results. Try broadening your ICP search criteria.",
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Apify returned 0 results for this search." },
      { status: 422 }
    );
  }

  /* ---- ICP compliance filter (keeps output aligned with selected search) ---- */
  const selectedTitles = ((icp.job_titles ?? []) as string[]).filter(Boolean);
  const selectedIndustries = ((icp.industries ?? []) as string[])
    .filter(Boolean)
    .map((value) => value.toLowerCase().trim());
  const selectedKeywords = Array.from(
    new Set(((icp.industry_keywords ?? []) as string[]).filter(Boolean))
  );
  const selectedCountry = normalizeCountry(icp.geography);
  const requiresCountry = !!selectedCountry && selectedCountry !== "global";
  const b2bSaasIntent =
    selectedKeywords.some((k) => /\bb2b\b/i.test(k) || /\bsaas\b/i.test(k)) ||
    selectedIndustries.some(
      (i) =>
        i.includes("computer software") ||
        i.includes("internet") ||
        i.includes("information technology")
    );
  const relevanceThreshold = b2bSaasIntent ? 45 : 30;
  const filterDropReasons = { title: 0, industry: 0, country: 0, relevance: 0 };
  const relevanceDebug: number[] = [];

  const batchForProcessing: ApifyDatasetItem[] = batch.filter((item) => {
    const titleOk = titleMatches(selectedTitles, item.job_title);

    const searchableIndustryText = [
      item.industry,
      item.keywords,
      item.company_description,
      item.company_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const leadIndustry = (item.industry ?? "").toLowerCase().trim();
    const leadTech = (item.company_technologies ?? "").toLowerCase().trim();
    const industryMatch =
      selectedIndustries.length === 0 ||
      (leadIndustry.length > 0 &&
        selectedIndustries.some((value) => leadIndustry.includes(value)));
    const keywordMatch =
      selectedKeywords.length === 0 ||
      (searchableIndustryText.length > 0 &&
        textIncludesAny(searchableIndustryText, selectedKeywords));
    const industryOk =
      selectedIndustries.length > 0
        ? industryMatch
        : selectedKeywords.length > 0
          ? keywordMatch
          : true;
    const relevanceScore = computeRelevanceScore({
      selectedIndustries,
      selectedKeywords,
      industry: leadIndustry,
      searchableText: searchableIndustryText,
      technologies: leadTech,
    });
    relevanceDebug.push(relevanceScore);
    const relevanceOk =
      selectedIndustries.length === 0 && selectedKeywords.length === 0
        ? true
        : relevanceScore >= relevanceThreshold;

    const leadCountry = normalizeCountry(item.company_country ?? item.country);
    const countryOk =
      !requiresCountry || (leadCountry != null && leadCountry === selectedCountry);

    if (!titleOk) filterDropReasons.title++;
    if (!industryOk) filterDropReasons.industry++;
    if (!countryOk) filterDropReasons.country++;
    if (!relevanceOk) filterDropReasons.relevance++;
    return titleOk && industryOk && countryOk && relevanceOk;
  });

  const avgRelevance =
    relevanceDebug.length > 0
      ? Math.round(
          (relevanceDebug.reduce((sum, value) => sum + value, 0) /
            relevanceDebug.length) *
            10
        ) / 10
      : 0;

  console.log("[Process] Applied ICP compliance filter", {
    inputItems: items.length,
    cappedItems: batch.length,
    processingItems: batchForProcessing.length,
    selectedTitles,
    selectedIndustries,
    selectedKeywords,
    selectedCountry: selectedCountry ?? "any",
    relevanceThreshold,
    avgRelevance,
    dropped: batch.length - batchForProcessing.length,
    reasons: filterDropReasons,
  });
  if (batchForProcessing.length === 0) {
    const errorMsg = `All ${batch.length} scraped leads were filtered out before processing. Try broadening your filters or increasing requested lead count.`;
    await setJobStepStatus(supabase, jobId, "dedupe", "failed", {
      error: errorMsg,
    });
    await updateJob(supabase, jobId, {
      status: "failed",
      error: errorMsg,
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: errorMsg }, { status: 422 });
  }

  /* ---- Email Verification (MX check — Apify already validated emails) ---- */
  await setJobStepStatus(supabase, jobId, "verify_mx", "running");
  await updateJob(supabase, jobId, {
    progress_step: "verify_mx",
    progress_percent: 40,
  });

  // Collect all emails for bulk MX verification
  const allEmails = batchForProcessing
    .map((item) => item.email?.toString?.()?.trim())
    .filter((e): e is string => !!e);

  // Bulk verify — caches MX lookups per domain, much faster than one-by-one
  const verificationByEmail = await verifyEmails(allEmails);

  console.log(`[Process] Verified ${verificationByEmail.size} emails`);
  const statusCounts = { valid: 0, catch_all: 0, invalid: 0, risky: 0 };
  for (const v of verificationByEmail.values()) {
    statusCounts[v.status]++;
  }
  console.log("[Process] Verification breakdown:", statusCounts);

  await setJobStepStatus(supabase, jobId, "verify_mx", "succeeded");
  await updateJob(supabase, jobId, {
    progress_step: "dedupe",
    progress_percent: 50,
  });

  /* ---- Deduplicate ---- */
  const emails = Array.from(verificationByEmail.keys());
  const domains = batchForProcessing
    .map(
      (item) =>
        (item.company_domain ?? item.company_website)
          ?.toString()
          ?.replace(/^https?:\/\//, "")
          ?.replace(/\/.*$/, "")
          ?.toLowerCase() ?? null
    )
    .filter(Boolean) as string[];

  const existingEmailsSet = new Set<string>();
  const clientFilter = job.client_id ?? undefined;
  if (emails.length > 0) {
    let q = admin
      .from("leads")
      .select("email, email_normalized")
      .eq("user_id", user.id)
      .in("email", emails);
    if (clientFilter) q = q.eq("client_id", clientFilter);
    const { data: existingEmails } = await q;
    for (const lead of existingEmails ?? []) {
      if (lead.email) existingEmailsSet.add(lead.email.toLowerCase());
      if (lead.email_normalized)
        existingEmailsSet.add(lead.email_normalized.toLowerCase());
    }
  }

  const existingDomainName = new Set<string>();
  if (domains.length > 0) {
    const { data: existingDomains } = await admin
      .from("leads")
      .select("domain_normalized, first_name, last_name")
      .eq("user_id", user.id)
      .in("domain_normalized", domains);
    for (const lead of existingDomains ?? []) {
      const domain = lead.domain_normalized ?? "";
      const name = [lead.first_name, lead.last_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (domain && name) existingDomainName.add(`${domain}:${name}`);
    }
  }

  await setJobStepStatus(supabase, jobId, "dedupe", "running");

  const deduped = dedupeLeads(
    batchForProcessing.map((item) => ({
      email: item.email?.toString() ?? null,
      firstName: item.first_name?.toString() ?? null,
      lastName: item.last_name?.toString() ?? null,
      domain:
        (item.company_domain ?? item.company_website)
          ?.toString()
          ?.replace(/^https?:\/\//, "")
          ?.replace(/\/.*$/, "") ?? null,
    })),
    existingEmailsSet,
    existingDomainName
  );

  await setJobStepStatus(supabase, jobId, "dedupe", "succeeded");

  /* ---- Classify ---- */
  await setJobStepStatus(supabase, jobId, "classify", "running");
  await setJobStepStatus(supabase, jobId, "classify", "succeeded");
  await updateJob(supabase, jobId, {
    progress_step: "enrich",
    progress_percent: 65,
  });

  /* ---- Enrich ---- */
  await setJobStepStatus(supabase, jobId, "enrich", "running");
  const enriched = deduped.map((lead) => {
    const item = batchForProcessing.find(
      (i) =>
        i.email?.toString()?.toLowerCase() ===
        (lead.email ?? "").toLowerCase()
    );
    return {
      ...lead,
      item,
      enriched: item ? enrichFromApify(item) : {},
    };
  });
  await setJobStepStatus(supabase, jobId, "enrich", "succeeded");
  await updateJob(supabase, jobId, {
    progress_step: "store",
    progress_percent: 80,
  });

  /* ---- Store ---- */
  await setJobStepStatus(supabase, jobId, "store", "running");

  const leadRows = enriched
    .map((lead) => {
      const item = lead.item;
      const email = (lead.email ?? "").trim();
      if (!email) return null; // Skip leads with no email

      const verification = verificationByEmail.get(email.toLowerCase());

      const rawDomain =
        item?.company_domain ??
        item?.company_website
          ?.toString()
          ?.replace(/^https?:\/\//, "")
          ?.replace(/\/.*$/, "") ??
        lead.domain ??
        null;

      return {
        user_id: user.id,
        client_id: job.client_id ?? null,
        email,
        first_name: item?.first_name?.toString() ?? lead.firstName ?? null,
        last_name: item?.last_name?.toString() ?? lead.lastName ?? null,
        title: item?.job_title?.toString() ?? null,
        company: item?.company_name?.toString() ?? null,
        domain: rawDomain,
        industry: item?.industry?.toString() ?? null,
        location:
          [item?.city, item?.state, item?.country].filter(Boolean).join(", ") ||
          null,
        linkedin_url: item?.linkedin?.toString() ?? null,
        job_id: jobId,
        icp_id: job.icp_id,
        verification_status: verification?.status ?? "risky",
        enriched: lead.enriched ?? {},
        export_status: null,
        email_normalized: lead.emailNormalized ?? null,
        domain_normalized: lead.domainNormalized ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  console.log(`[Process] Storing ${leadRows.length} leads for job ${jobId}`);

  let storedCount = 0;

  if (leadRows.length > 0) {
    // Insert in batches of 50 to avoid payload limits and pinpoint failures
    const BATCH_SIZE = 50;
    for (let i = 0; i < leadRows.length; i += BATCH_SIZE) {
      const chunk = leadRows.slice(i, i + BATCH_SIZE);
      const { data: upsertData, error: upsertError } = await admin
        .from("leads")
        .upsert(chunk, { onConflict: "user_id,email" })
        .select("id");

      if (upsertError) {
        console.error(
          `[Process] Upsert FAILED for chunk ${i}-${i + chunk.length}:`,
          upsertError.message,
          upsertError.details,
          upsertError.hint,
          upsertError.code
        );
        // Try inserting one-by-one to salvage what we can
        for (const row of chunk) {
          const { error: singleError } = await admin
            .from("leads")
            .upsert([row], { onConflict: "user_id,email" });
          if (singleError) {
            console.error(
              `[Process] Single upsert FAILED for ${row.email}:`,
              singleError.message
            );
          } else {
            storedCount++;
          }
        }
      } else {
        storedCount += upsertData?.length ?? chunk.length;
        console.log(
          `[Process] Upserted chunk ${i}-${i + chunk.length}: ${upsertData?.length ?? chunk.length} rows`
        );
      }
    }
  }

  console.log(`[Process] Total stored: ${storedCount} / ${leadRows.length}`);

  /* ---- Get stored lead IDs for verification rows ---- */
  const { data: storedLeads, error: storedLeadsError } = await admin
    .from("leads")
    .select("id, email")
    .eq("user_id", user.id)
    .eq("job_id", jobId);

  if (storedLeadsError) {
    console.error("[Process] Failed to fetch stored leads:", storedLeadsError.message);
  }

  console.log(`[Process] Found ${storedLeads?.length ?? 0} stored leads for verification`);

  const idByEmail = new Map<string, string>();
  for (const lead of storedLeads ?? []) {
    if (lead.email && lead.id)
      idByEmail.set(lead.email.toLowerCase(), lead.id);
  }

  const verificationRows = leadRows
    .map((lead) => {
      const verification = verificationByEmail.get(lead.email.toLowerCase());
      const leadId = idByEmail.get(lead.email.toLowerCase());
      if (!leadId) return null;
      return {
        lead_id: leadId,
        job_id: jobId,
        status: verification?.status ?? "risky",
        mx_valid: verification?.mxValid ?? false,
        smtp_valid: verification?.smtpValid ?? false,
        provider: "internal",
        logs: verification?.logs ?? [],
      };
    })
    .filter(Boolean);

  if (verificationRows.length > 0) {
    const { error: verifyInsertError } = await admin
      .from("lead_verifications")
      .insert(verificationRows);
    if (verifyInsertError) {
      console.error("[Process] Verification insert failed:", verifyInsertError.message);
    }
  }

  /* ---- Verification breakdown ---- */
  const verificationBreakdown = {
    valid: 0,
    catch_all: 0,
    invalid: 0,
    risky: 0,
  };
  for (const lead of leadRows) {
    const s = lead.verification_status ?? "risky";
    if (s in verificationBreakdown)
      (verificationBreakdown as Record<string, number>)[s]++;
  }

  await setJobStepStatus(supabase, jobId, "store", "succeeded");
  await updateJob(supabase, jobId, {
    actual_lead_count: storedCount || leadRows.length,
    verification_breakdown: verificationBreakdown,
    progress_step: "notify",
    progress_percent: 85,
  });

  /* ---- Notify ---- */
  await setJobStepStatus(supabase, jobId, "notify", "running");
  await setJobStepStatus(supabase, jobId, "notify", "succeeded");

  /* -------------------------------------------------------------------- */
  /* Export to Instantly — OPTIONAL                                        */
  /* If no campaign is attached to the job, we skip the export step.       */
  /* The user can push to Instantly later via /api/jobs/push-to-instantly.  */
  /* -------------------------------------------------------------------- */
  const campaignId = job.instantly_campaign_id ?? null;
  let exportResult: { added: number; skipped: number } | null = null;
  let exportSkipped = false;

  if (!campaignId) {
    // No campaign selected → skip export entirely
    exportSkipped = true;
    await setJobStepStatus(supabase, jobId, "export", "succeeded", {
      note: "Skipped — no Instantly campaign selected. Push to Instantly later.",
    });
  } else {
    await updateJob(supabase, jobId, {
      progress_step: "export",
      progress_percent: 90,
    });
    await setJobStepStatus(supabase, jobId, "export", "running");

    const exportLeads = leadRows.filter(
      (lead) =>
        lead.verification_status === "valid" ||
        lead.verification_status === "catch_all"
    );

    if (exportLeads.length > 0) {
      // Resolve Instantly API key using the new V2 pattern
      const apiKey = await resolveInstantlyApiKey(
        admin,
        user.id,
        job.client_id
      );

      if (apiKey) {
        try {
          const result = await pushLeadsToExistingCampaign(
            apiKey,
            campaignId,
            exportLeads.map((lead) => ({
              email: lead.email,
              first_name: lead.first_name ?? undefined,
              last_name: lead.last_name ?? undefined,
              company_name: lead.company ?? undefined,
              website: lead.domain
                ? `https://${lead.domain}`
                : undefined,
            }))
          );
          exportResult = result;

          // Mark leads as exported
          await admin
            .from("leads")
            .update({ export_status: "exported" })
            .in(
              "email",
              exportLeads.map((l) => l.email)
            )
            .eq("user_id", user.id);
        } catch (err) {
          // Export failed but job still succeeded (leads are stored)
          await setJobStepStatus(supabase, jobId, "export", "failed", {
            error:
              err instanceof Error
                ? err.message
                : "Instantly push failed",
          });
        }
      } else {
        // No API key found — skip export
        exportSkipped = true;
      }
    }

    if (!exportSkipped) {
      // Record export attempt
      await admin.from("lead_exports").insert({
        job_id: jobId,
        client_id: job.client_id ?? null,
        leads_sent: exportResult?.added ?? 0,
        success: !!exportResult,
        error: exportResult ? null : "No API key or exportable leads",
        instantly_campaign_id: campaignId,
      });
    }

    await setJobStepStatus(supabase, jobId, "export", "succeeded");
  }

  /* ---- Mark job as succeeded ---- */
  await updateJob(supabase, jobId, {
    status: "succeeded",
    progress_step: exportSkipped ? "store" : "export",
    progress_percent: 100,
    finished_at: new Date().toISOString(),
  });

  return NextResponse.json({
    jobId,
    status: "succeeded",
    leads: storedCount || leadRows.length,
    verificationBreakdown,
    exported: exportResult?.added ?? 0,
    exportSkipped,
  });
}
