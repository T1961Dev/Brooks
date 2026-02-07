import { getUserId } from "@/lib/auth";
import { getOnboardingCompletion } from "@/lib/onboarding/data";
import { OnboardingGuard } from "@/components/onboarding-guard";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getUserId();
  if (!userId) return null;

  const { completion } = await getOnboardingCompletion(userId);

  return (
    <>
      <OnboardingGuard completion={completion} />
      {children}
    </>
  );
}
