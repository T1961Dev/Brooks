import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { BusinessAssessmentForm } from "./form";

export default async function BusinessAssessmentPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<Record<string, string>>(userId, "business-assessment");

  return (
    <>
      <OnboardingHeader
        items={[
          { label: "Onboarding", href: "/onboarding/business-assessment" },
          { label: "Business Assessment" },
        ]}
      />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Business Assessment</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your company and who you sell to.
        </p>
        <div className="mt-8">
          <BusinessAssessmentForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
