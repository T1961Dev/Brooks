import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { IcpIntroductionForm } from "./form";

export default async function IcpIntroductionPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<Record<string, string>>(userId, "icp-introduction");

  return (
    <>
      <OnboardingHeader
        items={[
          { label: "Onboarding", href: "/onboarding/icp/introduction" },
          { label: "ICP", href: "/onboarding/icp/introduction" },
          { label: "Introduction" },
        ]}
      />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">ICP Introduction</h1>
        <p className="mt-2 text-muted-foreground">
          Briefly describe your niche and target buyer.
        </p>
        <div className="mt-8">
          <IcpIntroductionForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
