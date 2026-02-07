import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { CommonPatternsForm } from "./form";

export default async function CommonPatternsPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<{
    inCommon?: string;
    easyProfitable?: string;
    minimumSolution?: string;
  }>(userId, "icp-common-patterns");

  return (
    <>
      <OnboardingHeader
        items={[
          { label: "Onboarding", href: "/onboarding/icp/introduction" },
          { label: "ICP", href: "/onboarding/icp/common-patterns" },
          { label: "Common Patterns" },
        ]}
      />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Common Patterns</h1>
        <p className="mt-2 text-muted-foreground">
          Identify what your best clients have in common and what made them successful.
        </p>
        <div className="mt-8">
          <CommonPatternsForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
