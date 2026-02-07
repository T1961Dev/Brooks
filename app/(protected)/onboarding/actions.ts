"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";

export async function saveOnboardingStep(
  stepKey: OnboardingStepKey,
  data: Record<string, unknown>,
  completed?: boolean
) {
  const userId = await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase.from("onboarding_steps").upsert(
    {
      user_id: userId,
      step_key: stepKey,
      data,
      completed: completed ?? false,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,step_key" }
  );
  if (error) throw error;
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
}
