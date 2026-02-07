export const ONBOARDING_STEP_KEYS = [
  "business-assessment",
  "icp-introduction",
  "icp-your-best-clients",
  "icp-common-patterns",
  "icp-clients-to-avoid",
  "icp-agent",
  "offer-introduction",
  "offer-specific-results",
  "offer-implemented-processes",
  "offer-industry-knowledge",
  "offer-network-validation",
  "offer-trusted-businesses",
  "offer-credibility-leverage",
  "offer-agent",
  "cold-emails",
  "complete",
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

export const STEP_KEY_TO_PATH: Record<OnboardingStepKey, string> = {
  "business-assessment": "/onboarding/business-assessment",
  "icp-introduction": "/onboarding/icp/introduction",
  "icp-your-best-clients": "/onboarding/icp/your-best-clients",
  "icp-common-patterns": "/onboarding/icp/common-patterns",
  "icp-clients-to-avoid": "/onboarding/icp/clients-to-avoid",
  "icp-agent": "/onboarding/icp/icp-agent",
  "offer-introduction": "/onboarding/offer/introduction",
  "offer-specific-results": "/onboarding/offer/specific-results",
  "offer-implemented-processes": "/onboarding/offer/implemented-processes",
  "offer-industry-knowledge": "/onboarding/offer/industry-knowledge",
  "offer-network-validation": "/onboarding/offer/network-validation",
  "offer-trusted-businesses": "/onboarding/offer/trusted-businesses",
  "offer-credibility-leverage": "/onboarding/offer/credibility-leverage",
  "offer-agent": "/onboarding/offer/offer-agent",
  "cold-emails": "/onboarding/cold-emails",
  complete: "/onboarding/complete",
};

export const STEP_DISPLAY_LABELS: Record<OnboardingStepKey, string> = {
  "business-assessment": "Business Assessment",
  "icp-introduction": "Introduction",
  "icp-your-best-clients": "Your Best Clients",
  "icp-common-patterns": "Common Patterns",
  "icp-clients-to-avoid": "Clients to Avoid",
  "icp-agent": "ICP Agent",
  "offer-introduction": "Introduction",
  "offer-specific-results": "Specific Results",
  "offer-implemented-processes": "Implemented Processes",
  "offer-industry-knowledge": "Industry Knowledge",
  "offer-network-validation": "Network Validation",
  "offer-trusted-businesses": "Trusted Businesses",
  "offer-credibility-leverage": "Credibility Leverage",
  "offer-agent": "Offer Agent",
  "cold-emails": "Cold Emails",
  complete: "Complete",
};

export const PATH_TO_STEP_KEY: Record<string, OnboardingStepKey> = Object.fromEntries(
  (Object.entries(STEP_KEY_TO_PATH) as [OnboardingStepKey, string][]).map(
    ([k, v]) => [v, k]
  )
);

export function getStepIndex(stepKey: OnboardingStepKey): number {
  const i = ONBOARDING_STEP_KEYS.indexOf(stepKey);
  return i === -1 ? 0 : i;
}

export function getNextStepKey(current: OnboardingStepKey): OnboardingStepKey | null {
  const i = getStepIndex(current);
  if (i >= ONBOARDING_STEP_KEYS.length - 1) return null;
  return ONBOARDING_STEP_KEYS[i + 1];
}

export function getPrevStepKey(current: OnboardingStepKey): OnboardingStepKey | null {
  const i = getStepIndex(current);
  if (i <= 0) return null;
  return ONBOARDING_STEP_KEYS[i - 1];
}

export const SIDEBAR_GROUPS = [
  {
    id: "business-assessment",
    label: "Business Assessment",
    steps: ["business-assessment"] as OnboardingStepKey[],
  },
  {
    id: "icp",
    label: "ICP",
    steps: [
      "icp-introduction",
      "icp-your-best-clients",
      "icp-common-patterns",
      "icp-clients-to-avoid",
      "icp-agent",
    ] as OnboardingStepKey[],
  },
  {
    id: "offer",
    label: "Offer",
    steps: [
      "offer-introduction",
      "offer-specific-results",
      "offer-implemented-processes",
      "offer-industry-knowledge",
      "offer-network-validation",
      "offer-trusted-businesses",
      "offer-credibility-leverage",
      "offer-agent",
    ] as OnboardingStepKey[],
  },
  {
    id: "cold-emails",
    label: "Cold Emails",
    steps: ["cold-emails"] as OnboardingStepKey[],
  },
  {
    id: "complete",
    label: "Complete",
    steps: ["complete"] as OnboardingStepKey[],
  },
] as const;
