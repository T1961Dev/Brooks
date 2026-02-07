import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { CredibilityLeverageForm } from "./form";

export default async function CredibilityLeveragePage() {
  const userId = await requireAuth();
  const initialData = await getStepData<Record<string, string>>(userId, "offer-credibility-leverage");

  return (
    <>
      <OnboardingHeader items={[{ label: "Onboarding" }, { label: "Offer" }, { label: "Credibility Leverage" }]} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Credibility Leverage</h1>
        <p className="mt-2 text-muted-foreground">Founder story, proof assets, testimonials.</p>
        <div className="mt-8">
          <CredibilityLeverageForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
