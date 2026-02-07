import type { SupabaseClient } from "@supabase/supabase-js";

export type JobStep =
  | "scrape"
  | "verify"
  | "verify_mx"
  | "verify_smtp"
  | "dedupe"
  | "classify"
  | "enrich"
  | "store"
  | "notify"
  | "export";
export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export async function initJobSteps(client: SupabaseClient, jobId: string) {
  const steps: Array<{ job_id: string; step: JobStep; status: JobStatus }> = [
    { job_id: jobId, step: "scrape", status: "queued" },
    { job_id: jobId, step: "verify_mx", status: "queued" },
    { job_id: jobId, step: "verify_smtp", status: "queued" },
    { job_id: jobId, step: "dedupe", status: "queued" },
    { job_id: jobId, step: "classify", status: "queued" },
    { job_id: jobId, step: "enrich", status: "queued" },
    { job_id: jobId, step: "store", status: "queued" },
    { job_id: jobId, step: "notify", status: "queued" },
    { job_id: jobId, step: "export", status: "queued" },
  ];
  await client.from("lead_job_steps").insert(steps);
}

export async function setJobStepStatus(
  client: SupabaseClient,
  jobId: string,
  step: JobStep,
  status: JobStatus,
  logs?: unknown
) {
  await client
    .from("lead_job_steps")
    .update({
      status,
      logs: logs ?? undefined,
      started_at: status === "running" ? new Date().toISOString() : undefined,
      finished_at: status === "succeeded" || status === "failed" ? new Date().toISOString() : undefined,
    })
    .eq("job_id", jobId)
    .eq("step", step);
}

export async function updateJob(
  client: SupabaseClient,
  jobId: string,
  data: Record<string, unknown>
) {
  await client.from("lead_jobs").update({ ...data, updated_at: new Date().toISOString() }).eq("id", jobId);
}
