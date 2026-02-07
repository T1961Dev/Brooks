import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getApifyRunStatus, getApifyDatasetItems } from "@/lib/integrations/apify";
import { setJobStepStatus, updateJob } from "@/lib/jobs/orchestrator";
import { dedupeLeads } from "@/lib/leads/dedupe";
import { verifyEmail } from "@/lib/leads/verification";
import { enrichFromApify } from "@/lib/leads/enrich";
import { pushLeadsToExistingCampaign } from "@/lib/integrations/instantly";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const jobId = (body.jobId as string | undefined)?.trim();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: job } = await supabase
    .from("lead_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.status === "succeeded") {
    return NextResponse.json({ job, status: "succeeded" });
  }

  if (!job.apify_run_id) {
    return NextResponse.json({ error: "Job missing apify_run_id" }, { status: 400 });
  }

  const status = await getApifyRunStatus(job.apify_run_id);
  if (status.status === "RUNNING") {
    await updateJob(supabase, jobId, { progress_step: "scrape", progress_percent: 30 });
    return NextResponse.json({ job, status: "running" });
  }

  if (status.status === "FAILED") {
    await setJobStepStatus(supabase, jobId, "scrape", "failed", { error: "Apify run failed" });
    await updateJob(supabase, jobId, {
      status: "failed",
      error: "Apify run failed",
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: "Apify run failed" }, { status: 500 });
  }

  if (!status.datasetId) {
    return NextResponse.json({ error: "No datasetId returned" }, { status: 500 });
  }

  await setJobStepStatus(supabase, jobId, "scrape", "succeeded");
  await updateJob(supabase, jobId, {
    apify_dataset_id: status.datasetId,
    progress_step: "verify",
    progress_percent: 35,
  });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const items = await getApifyDatasetItems(status.datasetId);
  const requestedCap = Math.max(0, job.requested_lead_count ?? 9999);
  const batchSize = Math.min(job.batch_size ?? 100, items.length, requestedCap);
  const batch = items.slice(0, batchSize);

  await setJobStepStatus(supabase, jobId, "verify_mx", "running");
  await updateJob(supabase, jobId, { progress_step: "verify_mx", progress_percent: 40 });
  const verificationByEmail = new Map<string, Awaited<ReturnType<typeof verifyEmail>>>();
  for (const item of batch) {
    const email = (item.email ?? item.Email ?? item.emailAddress)?.toString?.();
    if (!email) continue;
    verificationByEmail.set(email.toLowerCase(), await verifyEmail(email));
  }
  await setJobStepStatus(supabase, jobId, "verify_mx", "succeeded");
  await setJobStepStatus(supabase, jobId, "verify_smtp", "running");
  await setJobStepStatus(supabase, jobId, "verify_smtp", "succeeded");
  await updateJob(supabase, jobId, { progress_step: "dedupe", progress_percent: 50 });

  const emails = Array.from(verificationByEmail.keys());
  const domains = batch
    .map((item) => (item.domain ?? item.website)?.toString?.()?.toLowerCase())
    .filter(Boolean) as string[];

  const existingEmailsSet = new Set<string>();
  const clientFilter = job.client_id ?? undefined;
  if (emails.length > 0) {
    let q = admin.from("leads").select("email, email_normalized").eq("user_id", user.id).in("email", emails);
    if (clientFilter) q = q.eq("client_id", clientFilter);
    const { data: existingEmails } = await q;
    for (const lead of existingEmails ?? []) {
      if (lead.email) existingEmailsSet.add(lead.email.toLowerCase());
      if (lead.email_normalized) existingEmailsSet.add(lead.email_normalized.toLowerCase());
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
      const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ").toLowerCase();
      if (domain && name) existingDomainName.add(`${domain}:${name}`);
    }
  }

  await setJobStepStatus(supabase, jobId, "dedupe", "running");

  const deduped = dedupeLeads(
    batch.map((item) => ({
      email: (item.email ?? item.Email ?? item.emailAddress)?.toString?.() ?? null,
      firstName: (item.firstName ?? item.first_name)?.toString?.() ?? null,
      lastName: (item.lastName ?? item.last_name)?.toString?.() ?? null,
      domain: (item.domain ?? item.website)?.toString?.() ?? null,
    })),
    existingEmailsSet,
    existingDomainName
  );

  await setJobStepStatus(supabase, jobId, "dedupe", "succeeded");
  await setJobStepStatus(supabase, jobId, "classify", "running");
  await setJobStepStatus(supabase, jobId, "classify", "succeeded");
  await updateJob(supabase, jobId, { progress_step: "enrich", progress_percent: 65 });

  await setJobStepStatus(supabase, jobId, "enrich", "running");
  const enriched = deduped.map((lead) => {
    const item = batch.find((i) =>
      (i.email ?? i.Email ?? i.emailAddress)?.toString?.()?.toLowerCase() === (lead.email ?? "").toLowerCase()
    );
    return {
      ...lead,
      item,
      enriched: item ? enrichFromApify(item) : {},
    };
  });
  await setJobStepStatus(supabase, jobId, "enrich", "succeeded");
  await updateJob(supabase, jobId, { progress_step: "store", progress_percent: 80 });

  await setJobStepStatus(supabase, jobId, "store", "running");
  const leadRows = enriched.map((lead) => {
    const item = lead.item;
    const email = lead.email ?? "";
    const verification = verificationByEmail.get(email.toLowerCase());
    return {
      user_id: user.id,
      client_id: job.client_id ?? null,
      email,
      first_name: lead.firstName ?? null,
      last_name: lead.lastName ?? null,
      title: (item?.title ?? item?.jobTitle)?.toString?.() ?? null,
      company: (item?.company ?? item?.companyName)?.toString?.() ?? null,
      domain: (item?.domain ?? item?.website)?.toString?.() ?? lead.domain ?? null,
      job_id: jobId,
      icp_id: job.icp_id,
      verification_status: verification?.status ?? "risky",
      enriched: lead.enriched ?? {},
      export_status: null,
      email_normalized: lead.emailNormalized ?? null,
      domain_normalized: lead.domainNormalized ?? null,
    };
  });

  if (leadRows.length > 0) {
    await admin.from("leads").upsert(leadRows, { onConflict: "user_id,email" });
  }

  const { data: storedLeads } = await admin
    .from("leads")
    .select("id, email")
    .eq("user_id", user.id)
    .in("email", leadRows.map((l) => l.email));

  const idByEmail = new Map<string, string>();
  for (const lead of storedLeads ?? []) {
    if (lead.email && lead.id) idByEmail.set(lead.email.toLowerCase(), lead.id);
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
    await admin.from("lead_verifications").insert(verificationRows);
  }

  const verificationBreakdown = { valid: 0, catch_all: 0, invalid: 0, risky: 0 };
  for (const lead of leadRows) {
    const s = lead.verification_status ?? "risky";
    if (s in verificationBreakdown) (verificationBreakdown as Record<string, number>)[s]++;
  }

  await setJobStepStatus(supabase, jobId, "store", "succeeded");
  await updateJob(supabase, jobId, {
    actual_lead_count: leadRows.length,
    verification_breakdown: verificationBreakdown,
    progress_step: "notify",
    progress_percent: 85,
  });
  await setJobStepStatus(supabase, jobId, "notify", "running");
  await setJobStepStatus(supabase, jobId, "notify", "succeeded");
  await updateJob(supabase, jobId, { progress_step: "export", progress_percent: 90 });

  await setJobStepStatus(supabase, jobId, "export", "running");

  const exportLeads = leadRows.filter(
    (lead) => lead.verification_status === "valid" || lead.verification_status === "catch_all"
  );

  const campaignId = job.instantly_campaign_id ?? null;
  let exportResult: { leadsAdded: number } | null = null;
  if (exportLeads.length > 0 && campaignId) {
    let creds: { api_key?: string; workspace_id?: string } | undefined;
    if (job.client_id) {
      const { data: clientCreds } = await admin
        .from("user_integrations")
        .select("credentials")
        .eq("user_id", user.id)
        .eq("provider", "instantly")
        .eq("client_id", job.client_id)
        .single();
      creds = clientCreds?.credentials as typeof creds;
    }
    if (!creds?.api_key) {
      const { data: agencyCreds } = await admin
        .from("user_integrations")
        .select("credentials")
        .eq("user_id", user.id)
        .eq("provider", "instantly")
        .is("client_id", null)
        .single();
      creds = agencyCreds?.credentials as typeof creds;
    }
    if (creds?.api_key && creds?.workspace_id) {
      const { added } = await pushLeadsToExistingCampaign(
        creds.api_key,
        creds.workspace_id,
        campaignId,
        exportLeads.map((lead) => ({
          email: lead.email,
          first_name: lead.first_name ?? undefined,
          last_name: lead.last_name ?? undefined,
          company_name: lead.company ?? undefined,
        }))
      );
      exportResult = { leadsAdded: added };
      await admin
        .from("leads")
        .update({ export_status: "exported" })
        .in("email", exportLeads.map((l) => l.email))
        .eq("user_id", user.id);
    }
  }

  await admin.from("lead_exports").insert({
    job_id: jobId,
    client_id: job.client_id ?? null,
    leads_sent: exportResult?.leadsAdded ?? 0,
    success: !!exportResult,
    error: exportResult ? null : "No exportable leads or missing Instantly campaign",
    instantly_campaign_id: campaignId,
  });

  await setJobStepStatus(supabase, jobId, "export", "succeeded");
  await updateJob(supabase, jobId, {
    status: "succeeded",
    progress_step: "export",
    progress_percent: 100,
    finished_at: new Date().toISOString(),
  });

  return NextResponse.json({ jobId, status: "succeeded", leads: leadRows.length });
}
