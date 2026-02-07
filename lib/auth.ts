import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Use getUser() so the server validates the session with Supabase Auth. */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function requireAuth() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return userId;
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("onboarding_completed, full_name").eq("id", userId).single();
  return data;
}

export async function createProfileForUser(
  userId: string,
  fullName?: string,
  companyName?: string
) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName ?? null,
      company_name: companyName ?? null,
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}
