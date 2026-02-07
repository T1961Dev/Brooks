import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSelectedClientId } from "@/lib/client-context";
import { IcpView } from "./icp-view";

export default async function IcpPage() {
  const userId = await requireAuth();
  const selectedClientId = await getSelectedClientId();
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  let icpsQuery = supabase
    .from("icp_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (selectedClientId) {
    icpsQuery = icpsQuery.eq("client_id", selectedClientId);
  }
  const { data: icps } = await icpsQuery;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">ICP builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define your ideal customer profiles to power scraping and filtering.
        </p>
      </header>
      <div className="flex-1 p-6">
        <IcpView initialIcps={icps ?? []} initialClients={clients ?? []} selectedClientId={selectedClientId} />
      </div>
    </div>
  );
}
