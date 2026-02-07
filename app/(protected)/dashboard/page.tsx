import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSelectedClientId } from "@/lib/client-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const userId = await requireAuth();
  const selectedClientId = await getSelectedClientId();
  const supabase = await createClient();

  let leadsCount = 0;
  let jobsCount = 0;
  let campaignsCount = 0;
  if (selectedClientId) {
    const [leads, jobs, campaigns] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("client_id", selectedClientId),
      supabase.from("lead_jobs").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("client_id", selectedClientId),
      supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("client_id", selectedClientId),
    ]);
    leadsCount = leads.count ?? 0;
    jobsCount = jobs.count ?? 0;
    campaignsCount = campaigns.count ?? 0;
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview for the selected client. Use the client switcher in the header to change context.
        </p>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-6">
        {!selectedClientId ? (
          <Card className="border-border bg-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              Select a client in the header to see their leads, jobs, and campaigns.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{leadsCount}</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/leads">View leads</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Lead jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{jobsCount}</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/jobs">View jobs</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{campaignsCount}</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/campaigns">View campaigns</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start" size="sm">
              <Link href="/clients">Clients</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start" size="sm">
              <Link href="/icp">ICP builder</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start" size="sm">
              <Link href="/jobs">Lead jobs</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start" size="sm">
              <Link href="/integrations">Integrations (Instantly)</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
