import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { OfferIntroductionForm } from "./form";

export default async function OfferIntroductionPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<Record<string, string>>(userId, "offer-introduction");

  return (
    <>
      <OnboardingHeader
        items={[
          { label: "Onboarding", href: "/onboarding/offer/introduction" },
          { label: "Offer", href: "/onboarding/offer/introduction" },
          { label: "Introduction" },
        ]}
      />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Offer Introduction</h1>
        <p className="mt-2 text-muted-foreground">
          Name your offer and define the one-line promise, price range, and timeline.
        </p>
        <div className="mt-8">
          <OfferIntroductionForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
