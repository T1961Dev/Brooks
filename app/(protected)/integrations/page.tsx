import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSelectedClientId } from "@/lib/client-context";
import { IntegrationsView } from "./integrations-view";

export default async function IntegrationsPage() {
  const userId = await requireAuth();
  const selectedClientId = await getSelectedClientId();
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your Instantly account to push leads directly to campaigns.
        </p>
      </header>
      <div className="flex-1 p-6">
        <div className="max-w-2xl">
          <IntegrationsView
            clients={clients ?? []}
            selectedClientId={selectedClientId}
          />
        </div>
      </div>
    </div>
  );
}
