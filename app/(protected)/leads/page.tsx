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
import { Badge } from "@/components/ui/badge";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function VerificationBadge({ status }: { status: string | null }) {
  switch (status) {
    case "valid":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs"
        >
          Valid
        </Badge>
      );
    case "catch_all":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs"
        >
          Catch-all
        </Badge>
      );
    case "invalid":
      return (
        <Badge
          variant="outline"
          className="border-red-500/30 bg-red-500/10 text-red-400 text-xs"
        >
          Invalid
        </Badge>
      );
    case "risky":
      return (
        <Badge
          variant="outline"
          className="border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs"
        >
          Risky
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="border-border bg-muted/50 text-muted-foreground text-xs"
        >
          {status ?? "—"}
        </Badge>
      );
  }
}

function ExportBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }
  if (status === "exported") {
    return (
      <Badge
        variant="outline"
        className="border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs"
      >
        Exported
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-border bg-muted/50 text-muted-foreground text-xs"
    >
      {status}
    </Badge>
  );
}

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
      "id, email, first_name, last_name, title, company, domain, location, linkedin_url, verification_status, export_status, job_id, icp_id, client_id"
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Leads</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Leads from your scrape. Deduplicated by email.
        </p>
      </div>

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
                  <TableHead className="text-muted-foreground w-10"></TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Title</TableHead>
                  <TableHead className="text-muted-foreground">Company</TableHead>
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(leads ?? []).length === 0 ? (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={8} className="text-muted-foreground text-center py-8">
                      No leads yet. Run a lead job to generate leads.
                    </TableCell>
                  </TableRow>
                ) : (
                  (leads ?? []).map((lead) => {
                    const fullName =
                      [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—";
                    const hasLinkedIn = !!lead.linkedin_url;

                    return (
                      <TableRow key={lead.id} className="border-border/50 hover:bg-muted/30">
                        {/* LinkedIn icon */}
                        <TableCell className="w-10 pr-0">
                          {hasLinkedIn ? (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`View ${fullName} on LinkedIn`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#0A66C2]/10 transition-colors"
                            >
                              <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7">
                              <LinkedInIcon className="h-4 w-4 text-muted-foreground/20" />
                            </span>
                          )}
                        </TableCell>
                        {/* Name */}
                        <TableCell className="text-foreground font-medium whitespace-nowrap">
                          {fullName}
                        </TableCell>
                        {/* Email */}
                        <TableCell className="text-muted-foreground text-sm">{lead.email}</TableCell>
                        <TableCell className="text-foreground text-sm whitespace-nowrap">{lead.title ?? "—"}</TableCell>
                        <TableCell className="text-foreground text-sm whitespace-nowrap">{lead.company ?? "—"}</TableCell>
                        <TableCell className="text-foreground text-sm whitespace-nowrap">
                          {clients?.find((c) => c.id === lead.client_id)?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <VerificationBadge status={lead.verification_status} />
                        </TableCell>
                        <TableCell>
                          <ExportBadge status={lead.export_status} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
