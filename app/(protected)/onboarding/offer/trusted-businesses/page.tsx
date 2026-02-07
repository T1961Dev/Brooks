import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { TrustedBusinessesForm } from "./form";

export default async function TrustedBusinessesPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<Record<string, string>>(userId, "offer-trusted-businesses");

  return (
    <>
      <OnboardingHeader items={[{ label: "Onboarding" }, { label: "Offer" }, { label: "Trusted Businesses" }]} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-white">Trusted Businesses</h1>
        <p className="mt-2 text-muted-foreground">Logos and case studies as text.</p>
        <div className="mt-8">
          <TrustedBusinessesForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
