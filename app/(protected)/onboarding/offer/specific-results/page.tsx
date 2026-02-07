import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { SpecificResultsForm } from "./form";

export default async function SpecificResultsPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<{ outcomes?: string[]; metrics?: string }>(userId, "offer-specific-results");

  return (
    <>
      <OnboardingHeader items={[{ label: "Onboarding" }, { label: "Offer" }, { label: "Specific Results" }]} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Specific Results</h1>
        <p className="mt-2 text-muted-foreground">Bullet outcomes and quantified metrics.</p>
        <div className="mt-8">
          <SpecificResultsForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
