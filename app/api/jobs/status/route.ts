import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApifyRunStatus } from "@/lib/integrations/apify";
import { updateJob } from "@/lib/jobs/orchestrator";

/**
 * GET /api/jobs/status?jobId=...
 *
 * Lightweight polling endpoint. Returns the job + steps.
 * If the job is still in the "scrape" phase and has an apify_run_id,
 * we check the live Apify status and update the DB accordingly.
 * This lets the UI know the moment scraping finishes so it can
 * auto-trigger the process step.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId)
    return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job } = await supabase
    .from("lead_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  /* ---- Live Apify check when job is scraping ---- */
  let apifyStatus: string | null = null;
  if (
    job.status === "running" &&
    job.progress_step === "scrape" &&
    job.apify_run_id &&
    !job.apify_dataset_id
  ) {
    try {
      const status = await getApifyRunStatus(job.apify_run_id);
      apifyStatus = status.status;

      if (status.status === "SUCCEEDED" && status.datasetId) {
        // Apify is done — save dataset ID so process route can pick it up
        await updateJob(supabase, jobId, {
          apify_dataset_id: status.datasetId,
          progress_percent: 35,
        });
        // Mutate job object to reflect the update in the response
        job.apify_dataset_id = status.datasetId;
        job.progress_percent = 35;
      } else if (status.status === "FAILED") {
        await updateJob(supabase, jobId, {
          status: "failed",
          error: "Apify run failed",
          finished_at: new Date().toISOString(),
        });
        job.status = "failed";
        job.error = "Apify run failed";
      }
    } catch {
      // Don't fail the status check if Apify is unreachable
    }
  }

  const { data: steps } = await supabase
    .from("lead_job_steps")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    job,
    steps: steps ?? [],
    apifyStatus,
    // Convenience flags for the UI:
    scrapeComplete:
      job.status === "succeeded" ||
      job.status === "failed" ||
      !!job.apify_dataset_id,
    readyToProcess:
      job.status === "running" &&
      !!job.apify_dataset_id &&
      job.progress_step === "scrape",
  });
}
