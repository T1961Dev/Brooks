import { OnboardingHeader } from "@/components/onboarding-header";
import { OfferAgentView } from "./view";

export default function OfferAgentPage() {
  return (
    <>
      <OnboardingHeader
        items={[
          { label: "Onboarding", href: "/onboarding/offer/introduction" },
          { label: "Offer", href: "/onboarding/offer/offer-agent" },
          { label: "Offer Agent" },
        ]}
      />
      <OfferAgentView />
    </>
  );
}
