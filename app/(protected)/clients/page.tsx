import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClientsView } from "./clients-view";

export default async function ClientsPage() {
  const userId = await requireAuth();
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, industry, website, notes, onboarding_completed, onboarding_completed_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clients</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create and manage clients for your agency.
        </p>
      </header>
      <div className="flex-1 p-6">
        <ClientsView initialClients={clients ?? []} />
      </div>
    </div>
  );
}
