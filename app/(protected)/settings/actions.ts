"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(updates: { full_name?: string; company_name?: string; avatar_url?: string | null }) {
  const userId = await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
