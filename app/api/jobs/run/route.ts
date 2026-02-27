import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runActorAndFetchItems, headcountToSizeFilter } from "@/lib/integrations/apify";
import { setJobStepStatus, updateJob } from "@/lib/jobs/orchestrator";

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const jobId = (body.jobId as string | undefined)?.trim();
  if (!jobId)
    return NextResponse.json({ error: "jobId required" }, { status: 400 });

  /* ---- Load job ---- */
  const { data: job } = await supabase
    .from("lead_jobs")
    .select(
      "id, icp_id, client_id, batch_size, requested_lead_count, status, source"
    )
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  /* ---- Load ICP ---- */
  const { data: icp } = await supabase
    .from("icp_profiles")
    .select(
      "job_titles, industries, industry_keywords, geography, headcount_brackets, headcount_min, headcount_max, technologies, client_id, company_type, revenue_min, revenue_max"
    )
    .eq("id", job.icp_id)
    .eq("user_id", user.id)
    .single();

  if (!icp) {
    return NextResponse.json({ error: "ICP not found" }, { status: 404 });
  }
  if (icp.client_id && job.client_id && icp.client_id !== job.client_id) {
    return NextResponse.json(
      { error: "ICP does not match client" },
      { status: 400 }
    );
  }

  /* ---- Mark scrape step running ---- */
  await setJobStepStatus(supabase, jobId, "scrape", "running");
  await updateJob(supabase, jobId, {
    status: "running",
    progress_step: "scrape",
    progress_percent: 5,
    started_at: new Date().toISOString(),
  });

  try {
    /* ---- Map ICP → actor input ---- */

    const LEGACY_TO_ACTOR: Record<string, string[]> = {
      "1-10": ["1-10"],
      "11-50": ["11-20", "21-50"],
      "51-200": ["51-100", "101-200"],
      "201-500": ["201-500"],
      "501-1000": ["501-1000"],
      "1001-5000": ["1001-2000", "2001-5000"],
      "5001+": ["5001-10000", "10001-20000", "20001-50000", "50000+"],
    };
    const selectedHeadcountBrackets: string[] = (
      icp.headcount_brackets ?? []
    ).filter(Boolean) as string[];
    const sizeFilter: string[] =
      selectedHeadcountBrackets.length > 0
        ? Array.from(
            new Set(
              selectedHeadcountBrackets.flatMap(
                (b: string) => LEGACY_TO_ACTOR[b] ?? []
              )
            )
          )
        : headcountToSizeFilter(
            icp.headcount_min ?? null,
            icp.headcount_max ?? null
          );

    const COUNTRY_ALIASES: Record<string, string> = {
      usa: "united states",
      us: "united states",
      uk: "united kingdom",
      gb: "united kingdom",
      de: "germany",
      fr: "france",
      au: "australia",
      nl: "netherlands",
      es: "spain",
      it: "italy",
      ca: "canada",
    };

    let contactLocation: string[] | undefined;
    let contactCity: string[] | undefined;

    if (icp.geography && icp.geography !== "Global") {
      const raw = icp.geography.toLowerCase().trim();
      const resolved = COUNTRY_ALIASES[raw] ?? raw;
      contactLocation = [resolved];
    }

    // Use specific sub-niche keywords when available — these produce far better
    // results than broad categories like "B2B SaaS". Fall back to industry names
    // only if the user didn't pick any sub-niches.
    const industryKeywords: string[] = (icp.industry_keywords ?? []).filter(Boolean) as string[];
    const companyKeywords: string[] =
      industryKeywords.length > 0
        ? industryKeywords
        : [...(icp.industries ?? [])];

    console.log("[Run] ICP filters →", {
      industries: icp.industries,
      industry_keywords: industryKeywords,
      job_titles: icp.job_titles,
      geography: icp.geography,
      headcount_brackets: selectedHeadcountBrackets,
      revenue: `${icp.revenue_min ?? "any"}-${icp.revenue_max ?? "any"}`,
      companyKeywords,
      sizeFilter,
      contactLocation,
    });

    const fetchCount = job.requested_lead_count ?? job.batch_size ?? 100;

    // Run the actor and fetch items in one go (matches reference pattern)
    const result = await runActorAndFetchItems({
      company_keywords:
        companyKeywords.length > 0 ? companyKeywords : undefined,
      contact_job_title:
        icp.job_titles && icp.job_titles.length > 0
          ? icp.job_titles
          : undefined,
      contact_location: contactLocation,
      contact_city: contactCity,
      size: sizeFilter.length > 0 ? sizeFilter : undefined,
      email_status: ["validated"],
      fetch_count: fetchCount,
      file_name: "Prospects",
    });

    if (result.items.length === 0) {
      await setJobStepStatus(supabase, jobId, "scrape", "failed", {
        error: "Apify actor returned 0 results for this search criteria",
      });
      await updateJob(supabase, jobId, {
        status: "failed",
        error:
          "Apify returned 0 results. The search criteria may be too restrictive, or there are no matches in the database for this combination of keywords, location, size, and titles.",
        finished_at: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error:
            "Apify returned 0 results for this search criteria. Try broadening your ICP filters.",
          runId: result.runId,
          datasetId: result.datasetId,
        },
        { status: 422 }
      );
    }

    // Log industry distribution from results for debugging
    const industryDist: Record<string, number> = {};
    for (const item of result.items.slice(0, 200)) {
      const ind = (item.industry ?? "unknown").toString();
      industryDist[ind] = (industryDist[ind] ?? 0) + 1;
    }
    console.log("[Run] Industry distribution from actor:", industryDist);

    await setJobStepStatus(supabase, jobId, "scrape", "succeeded");
    await updateJob(supabase, jobId, {
      apify_run_id: result.runId,
      apify_dataset_id: result.datasetId,
      status: "running",
      progress_step: "scrape",
      progress_percent: 35,
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      datasetId: result.datasetId,
      itemCount: result.items.length,
      scrapeComplete: true,
    });
  } catch (err) {
    await setJobStepStatus(supabase, jobId, "scrape", "failed", {
      error: err instanceof Error ? err.message : "Apify run failed",
    });
    await updateJob(supabase, jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Apify run failed",
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Apify run failed" },
      { status: 500 }
    );
  }
}
