import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSelectedClientId } from "@/lib/client-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; jobId?: string; icpId?: string; clientId?: string; q?: string }>;
}) {
  const userId = await requireAuth();
  const selectedClientId = await getSelectedClientId();
  const supabase = await createClient();
  const { status, jobId, icpId, clientId: paramClientId, q } = await searchParams;
  const clientId = paramClientId ?? selectedClientId;

  let query = supabase
    .from("leads")
    .select(
      "id, email, first_name, last_name, title, company, domain, location, verification_status, export_status, job_id, icp_id, client_id"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("verification_status", status);
  if (jobId) query = query.eq("job_id", jobId);
  if (icpId) query = query.eq("icp_id", icpId);
  if (clientId) query = query.eq("client_id", clientId);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data: leads } = await query;

  const { data: jobs } = await supabase
    .from("lead_jobs")
    .select("id, instantly_list_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: icps } = await supabase
    .from("icp_profiles")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Leads</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Leads from your scrape. Deduplicated by email.</p>
      </header>
      <div className="flex-1 p-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>All leads</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-5">
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search by email"
                className="rounded-xl bg-muted border-border text-foreground"
              />
              <select
                name="status"
                defaultValue={status ?? ""}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
              >
                <option value="">All statuses</option>
                <option value="valid">Valid</option>
                <option value="catch_all">Catch-all</option>
                <option value="invalid">Invalid</option>
                <option value="risky">Risky</option>
              </select>
              <select
                name="clientId"
                defaultValue={clientId ?? ""}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
              >
                <option value="">All clients</option>
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                name="jobId"
                defaultValue={jobId ?? ""}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
              >
                <option value="">All jobs</option>
                {(jobs ?? []).map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.instantly_list_name ?? "Lead job"}
                  </option>
                ))}
              </select>
              <select
                name="icpId"
                defaultValue={icpId ?? ""}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
              >
                <option value="">All ICPs</option>
                {(icps ?? []).map((icp) => (
                  <option key={icp.id} value={icp.id}>
                    {icp.name}
                  </option>
                ))}
              </select>
              <div className="md:col-span-5">
                <Button type="submit" variant="outline" className="rounded-xl border-border text-foreground">
                  Apply filters
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Title</TableHead>
                    <TableHead className="text-muted-foreground">Company</TableHead>
                    <TableHead className="text-muted-foreground">Client</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Export</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leads ?? []).length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={7} className="text-muted-foreground text-center py-8">
                        No leads yet. Run a lead job to generate leads.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (leads ?? []).map((lead) => (
                      <TableRow key={lead.id} className="border-border">
                        <TableCell className="text-foreground">{lead.email}</TableCell>
                        <TableCell className="text-foreground">
                          {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="text-foreground">{lead.title ?? "—"}</TableCell>
                        <TableCell className="text-foreground">{lead.company ?? "—"}</TableCell>
                        <TableCell className="text-foreground">
                          {clients?.find((c) => c.id === lead.client_id)?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-foreground">{lead.verification_status ?? "—"}</TableCell>
                        <TableCell className="text-foreground">{lead.export_status ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
