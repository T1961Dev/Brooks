import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { IndustryKnowledgeForm } from "./form";

export default async function IndustryKnowledgePage() {
  const userId = await requireAuth();
  const initialData = await getStepData<Record<string, string>>(userId, "offer-industry-knowledge");

  return (
    <>
      <OnboardingHeader items={[{ label: "Onboarding" }, { label: "Offer" }, { label: "Industry Knowledge" }]} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-white">Industry Knowledge</h1>
        <p className="mt-2 text-muted-foreground">Industries you understand and proof points.</p>
        <div className="mt-8">
          <IndustryKnowledgeForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
