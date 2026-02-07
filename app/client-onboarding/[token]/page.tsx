import { createClient as createServiceClient } from "@supabase/supabase-js";
import { hashToken } from "@/lib/security/tokens";
import { ClientOnboardingForm } from "./form";

export default async function ClientOnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = hashToken(token);
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tokenRow } = await admin
    .from("client_onboarding_tokens")
    .select("client_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .single();

  if (!tokenRow) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Invalid link</h1>
        <p className="mt-2 text-sm text-muted-foreground">This onboarding link is not valid.</p>
      </div>
    );
  }

  if (tokenRow.used_at) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Link already used</h1>
        <p className="mt-2 text-sm text-muted-foreground">This onboarding link was already completed.</p>
      </div>
    );
  }

  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Link expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ask your agency for a fresh link.</p>
      </div>
    );
  }

  const { data: client } = await admin
    .from("clients")
    .select("id, name")
    .eq("id", tokenRow.client_id)
    .single();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-foreground">Client onboarding</h1>
      <p className="mt-2 text-muted-foreground">
        Complete the details below so your agency can launch outreach for {client?.name ?? "your team"}.
      </p>
      <div className="mt-8">
        <ClientOnboardingForm token={token} clientName={client?.name ?? "Client"} />
      </div>
    </div>
  );
}
