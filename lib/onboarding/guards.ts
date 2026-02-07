import type { OnboardingStepKey } from "./steps";
import {
  ONBOARDING_STEP_KEYS,
  getStepIndex,
  getNextStepKey,
  STEP_KEY_TO_PATH,
} from "./steps";

export type StepCompletionMap = Record<OnboardingStepKey, boolean>;

/**
 * Business Assessment must be completed to unlock ICP.
 * ICP Agent must be completed to unlock Offer.
 * Offer Agent must be completed to unlock Cold Emails.
 * Cold Emails must be completed to unlock Complete.
 */
export function isStepUnlocked(
  stepKey: OnboardingStepKey,
  completion: StepCompletionMap
): boolean {
  const i = getStepIndex(stepKey);
  if (i === 0) return true; // business-assessment always unlocked

  // ICP section: all steps unlocked after business-assessment
  if (stepKey.startsWith("icp-")) {
    return completion["business-assessment"] === true;
  }

  // Offer section: unlocked after icp-agent
  if (stepKey.startsWith("offer-")) {
    return completion["icp-agent"] === true;
  }

  // Cold Emails: unlocked after offer-agent
  if (stepKey === "cold-emails") {
    return completion["offer-agent"] === true;
  }

  // Complete: unlocked after cold-emails
  if (stepKey === "complete") {
    return completion["cold-emails"] === true;
  }

  return false;
}

/**
 * First incomplete step in order (or first locked step if current is locked).
 */
export function getFirstIncompleteOrLockedStep(
  completion: StepCompletionMap
): OnboardingStepKey {
  for (const key of ONBOARDING_STEP_KEYS) {
    if (!isStepUnlocked(key, completion)) return key;
    if (!completion[key]) return key;
  }
  return "complete";
}

export function getRedirectPathForStep(
  stepKey: OnboardingStepKey,
  completion: StepCompletionMap
): string {
  if (!isStepUnlocked(stepKey, completion)) {
    return STEP_KEY_TO_PATH[getFirstIncompleteOrLockedStep(completion)];
  }
  return STEP_KEY_TO_PATH[stepKey];
}

export function getNextUnlockedPath(current: OnboardingStepKey, completion: StepCompletionMap): string | null {
  let next: OnboardingStepKey | null = getNextStepKey(current);
  while (next) {
    if (isStepUnlocked(next, completion)) return STEP_KEY_TO_PATH[next];
    next = getNextStepKey(next);
  }
  return null;
}
