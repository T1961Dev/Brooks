"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getRedirectPathForStep } from "@/lib/onboarding/guards";
import { PATH_TO_STEP_KEY } from "@/lib/onboarding/steps";
import type { StepCompletionMap } from "@/lib/onboarding/guards";

export function OnboardingGuard({ completion }: { completion: StepCompletionMap }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const normalized = pathname.replace(/\/$/, "") || "/onboarding";
    const stepKey = PATH_TO_STEP_KEY[normalized];
    if (!stepKey) return;
    const redirectPath = getRedirectPathForStep(stepKey, completion);
    if (redirectPath && redirectPath !== normalized) {
      router.replace(redirectPath);
    }
  }, [pathname, completion, router]);

  return null;
}
