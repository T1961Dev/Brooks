import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSelectedClientId } from "@/lib/client-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const userId = await requireAuth();
  const selectedClientId = await getSelectedClientId();
  const supabase = await createClient();
  const { clientId: paramClientId } = await searchParams;
  const clientId = paramClientId ?? selectedClientId;
  let query = supabase
    .from("campaigns")
    .select("id, name, status, instantly_campaign_id, created_at, client_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data: campaigns } = await query;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Instantly campaigns and status.</p>
      </header>
      <div className="flex-1 p-6">
      <div className="space-y-4">
        <form className="flex items-center gap-3">
          <select
            name="clientId"
            defaultValue={clientId ?? ""}
            className="h-10 rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
          >
            <option value="">All clients</option>
            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" className="rounded-xl border-border text-foreground">
            Apply
          </Button>
        </form>
        {(campaigns ?? []).length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              No campaigns yet. Sync leads to Instantly from the dashboard after scraping.
            </CardContent>
          </Card>
        ) : (
          (campaigns ?? []).map((c) => (
            <Card key={c.id} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{c.name ?? "Unnamed campaign"}</CardTitle>
                <Badge variant="secondary" className="bg-muted text-foreground">
                  {c.status ?? "—"}
                </Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Client: {clients?.find((client) => client.id === c.client_id)?.name ?? "—"} · Instantly
                ID: {c.instantly_campaign_id ?? "—"} · Created{" "}
                {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </div>
  );
}
