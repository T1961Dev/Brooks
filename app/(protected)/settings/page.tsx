import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const userId = await requireAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name, company_name, avatar_url").eq("id", userId ?? "").single();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile and account.</p>
      </header>
      <div className="flex-1 p-6">
      <div className="max-w-xl">
        <SettingsForm
          email={user?.email ?? ""}
          initialFullName={profile?.full_name ?? ""}
          initialCompanyName={profile?.company_name ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
        />
      </div>
      </div>
    </div>
  );
}
