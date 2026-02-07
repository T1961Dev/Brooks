import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSelectedClientId } from "@/lib/client-context";
import { JobsView } from "./jobs-view";

export default async function JobsPage() {
  const userId = await requireAuth();
  const selectedClientId = await getSelectedClientId();
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const { data: icps } = await supabase
    .from("icp_profiles")
    .select("id, name, client_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  let jobsQuery = supabase
    .from("lead_jobs")
    .select("id, status, batch_size, instantly_list_name, progress_step, progress_percent, created_at, client_id, requested_lead_count, actual_lead_count, verification_breakdown, finished_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (selectedClientId) jobsQuery = jobsQuery.eq("client_id", selectedClientId);
  const { data: jobs } = await jobsQuery;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lead jobs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create a job, run the pipeline, and monitor progress. All data is scoped to the selected client.
        </p>
      </header>
      <div className="flex-1 p-6">
        <JobsView
          initialIcps={icps ?? []}
          initialJobs={jobs ?? []}
          initialClients={clients ?? []}
          selectedClientId={selectedClientId}
        />
      </div>
    </div>
  );
}
