import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingHeader } from "@/components/onboarding-header";
import { ColdEmailsForm } from "./form";

export default async function ColdEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const userId = await requireAuth();
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const { clientId } = await searchParams;
  const activeClientId = clientId ?? clients?.[0]?.id ?? null;

  const { data: coldRow } = await supabase
    .from("client_cold_emails")
    .select("data")
    .eq("user_id", userId)
    .eq("client_id", activeClientId ?? "")
    .single();
  const initialData =
    (coldRow?.data as {
      chosenAngle?: string;
      sendingDomain?: string;
      fromName?: string;
      targetTitles?: string;
      targetIndustries?: string;
      personalizationTokens?: string;
      sequence?: { emails: Array<{ subject: string; body: string }> };
    }) ?? {};

  let angles: string[] = [];
  const { data: offerRun } = await supabase
    .from("agent_runs")
    .select("output")
    .eq("user_id", userId)
    .eq("agent_type", "offer")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const output = offerRun?.output as { coldEmailAngles?: string[] } | null;
  if (output?.coldEmailAngles?.length) angles = output.coldEmailAngles;

  return (
    <>
      <OnboardingHeader items={[{ label: "Onboarding" }, { label: "Cold Emails" }]} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Cold Emails</h1>
        <p className="mt-2 text-muted-foreground">
          Choose an angle and configure your sequence. We&apos;ll generate 3 emails and subject lines.
        </p>
        <div className="mt-8">
          <ColdEmailsForm
            initialData={initialData}
            angles={angles}
            clients={clients ?? []}
            clientId={activeClientId}
          />
        </div>
      </div>
    </>
  );
}
