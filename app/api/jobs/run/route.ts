import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startApifyRun, headcountToSizeFilter } from "@/lib/integrations/apify";
import { setJobStepStatus, updateJob } from "@/lib/jobs/orchestrator";

export const maxDuration = 300; // Allow up to 5 minutes for Apify .call()

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
      "job_titles, industries, geography, headcount_min, headcount_max, technologies, client_id, company_type, revenue_min, revenue_max"
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
    /* ---- Map ICP filters → Apify actor input ---- */

    // Company size → "size" field with correct brackets
    const sizeFilter = headcountToSizeFilter(
      icp.headcount_min ?? null,
      icp.headcount_max ?? null
    );

    // Geography → contact_location (countries, always lowercase)
    // Our GEOGRAPHY_OPTIONS are all countries, so geography always maps to contact_location.
    // NEVER put a country into contact_city or a city into contact_location.
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
      // Lowercase the value and resolve common abbreviations
      const raw = icp.geography.toLowerCase().trim();
      const resolved = COUNTRY_ALIASES[raw] ?? raw;
      contactLocation = [resolved];
    }

    // Industries → company_keywords
    const companyKeywords: string[] = [
      ...(icp.industries ?? []),
      ...(icp.company_type ? [icp.company_type] : []),
    ];

    const fetchCount = job.requested_lead_count ?? job.batch_size ?? 100;

    // .call() runs the Apify actor and WAITS for it to finish.
    // When this returns, the dataset is ready to fetch.
    const result = await startApifyRun({
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

    // .call() waited for completion — scrape is done, dataset is available
    await setJobStepStatus(supabase, jobId, "scrape", "succeeded");
    await updateJob(supabase, jobId, {
      apify_run_id: result.runId,
      apify_dataset_id: result.datasetId ?? null,
      status: "running",
      progress_step: "scrape",
      progress_percent: 35,
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      datasetId: result.datasetId,
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
