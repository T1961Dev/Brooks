import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startApifyRun } from "@/lib/integrations/apify";
import { setJobStepStatus, updateJob } from "@/lib/jobs/orchestrator";

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
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: job } = await supabase
    .from("lead_jobs")
    .select("id, icp_id, client_id, batch_size, status, source")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const { data: icp } = await supabase
    .from("icp_profiles")
    .select("job_titles, industries, geography, headcount_min, headcount_max, technologies, client_id")
    .eq("id", job.icp_id)
    .eq("user_id", user.id)
    .single();

  if (!icp) {
    return NextResponse.json({ error: "ICP not found" }, { status: 404 });
  }
  if (icp.client_id && job.client_id && icp.client_id !== job.client_id) {
    return NextResponse.json({ error: "ICP does not match client" }, { status: 400 });
  }

  await setJobStepStatus(supabase, jobId, "scrape", "running");
  await updateJob(supabase, jobId, {
    status: "running",
    progress_step: "scrape",
    progress_percent: 5,
    started_at: new Date().toISOString(),
  });

  try {
    const result = await startApifyRun({
      nicheKeywords: icp.industries ?? [],
      targetTitles: icp.job_titles ?? [],
      geography: icp.geography ?? "",
      companySizeMin: icp.headcount_min ?? 10,
      companySizeMax: icp.headcount_max ?? 500,
      techFilters: icp.technologies ?? [],
    });

    await updateJob(supabase, jobId, {
      apify_run_id: result.runId,
      status: "running",
      progress_step: "scrape",
      progress_percent: 20,
    });

    return NextResponse.json({ runId: result.runId, status: result.status });
  } catch (err) {
    await setJobStepStatus(supabase, jobId, "scrape", "failed", {
      error: err instanceof Error ? err.message : "Apify start failed",
    });
    await updateJob(supabase, jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Apify start failed",
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Apify start failed" },
      { status: 500 }
    );
  }
}
