import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserId, getProfile } from "@/lib/auth";
import { getOnboardingCompletion } from "@/lib/onboarding/data";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { CLIENT_COOKIE_NAME } from "@/lib/constants";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const cookieStore = await cookies();
  const selectedClientId = cookieStore.get(CLIENT_COOKIE_NAME)?.value ?? null;

  const [{ completion, completedCount, totalSteps }, profile, clientsResult] = await Promise.all([
    getOnboardingCompletion(userId),
    getProfile(userId),
    (async () => {
        const s = await createClient();
        const r = await s.from("clients").select("id, name").eq("user_id", userId).order("created_at", { ascending: false });
        return r;
      })(),
  ]);

  const clients = clientsResult.data ?? [];
  const userInitial = profile?.full_name?.trim().slice(0, 1) ?? undefined;

  return (
    <AppShell
      sidebar={{
        completion,
        completedCount,
        totalSteps,
        isOnboarding: undefined,
        userInitial,
      }}
      clients={clients}
      selectedClientId={selectedClientId}
    >
      {children}
    </AppShell>
  );
}
