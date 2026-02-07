import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { NetworkValidationForm } from "./form";

export default async function NetworkValidationPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<Record<string, string>>(userId, "offer-network-validation");

  return (
    <>
      <OnboardingHeader items={[{ label: "Onboarding" }, { label: "Offer" }, { label: "Network Validation" }]} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Network Validation</h1>
        <p className="mt-2 text-muted-foreground">Communities and partnerships.</p>
        <div className="mt-8">
          <NetworkValidationForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
