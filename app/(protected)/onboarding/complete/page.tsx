import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { CompleteView } from "./view";

export default async function CompletePage() {
  const userId = await requireAuth();
  const coldEmailsData = await getStepData<{ sequence?: { emails: unknown[] } }>(userId, "cold-emails");
  const hasSequence = !!(coldEmailsData?.sequence?.emails?.length);

  return (
    <>
      <OnboardingHeader items={[{ label: "Onboarding" }, { label: "Complete" }]} showExit={false} />
      <CompleteView hasSequence={hasSequence} />
    </>
  );
}
