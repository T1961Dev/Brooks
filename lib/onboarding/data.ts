import { createClient } from "@/lib/supabase/server";
import type { OnboardingStepKey } from "./steps";
import { ONBOARDING_STEP_KEYS } from "./steps";
import type { StepCompletionMap } from "./guards";

export async function getOnboardingCompletion(userId: string): Promise<{
  completion: StepCompletionMap;
  completedCount: number;
  totalSteps: number;
}> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("onboarding_steps")
    .select("step_key, completed")
    .eq("user_id", userId);

  const completion = {} as StepCompletionMap;
  for (const key of ONBOARDING_STEP_KEYS) {
    completion[key] = false;
  }
  let completedCount = 0;
  if (rows) {
    for (const r of rows) {
      const key = r.step_key as OnboardingStepKey;
      if (ONBOARDING_STEP_KEYS.includes(key) && r.completed) {
        completion[key] = true;
        completedCount++;
      }
    }
  }
  return {
    completion,
    completedCount,
    totalSteps: ONBOARDING_STEP_KEYS.length,
  };
}

export async function getStepData<T = Record<string, unknown>>(
  userId: string,
  stepKey: OnboardingStepKey
): Promise<T> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("onboarding_steps")
    .select("data")
    .eq("user_id", userId)
    .eq("step_key", stepKey)
    .single();
  return (data?.data as T) ?? ({} as T);
}

/** Use from server/API only; uses service role to read onboarding_steps by userId. */
export async function getStepDataService<T = Record<string, unknown>>(
  userId: string,
  stepKey: OnboardingStepKey
): Promise<T> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("onboarding_steps")
    .select("data")
    .eq("user_id", userId)
    .eq("step_key", stepKey)
    .single();
  return (data?.data as T) ?? ({} as T);
}
