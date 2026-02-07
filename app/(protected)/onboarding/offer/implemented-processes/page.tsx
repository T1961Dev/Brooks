import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { ImplementedProcessesForm } from "./form";

export default async function ImplementedProcessesPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<Record<string, string>>(userId, "offer-implemented-processes");

  return (
    <>
      <OnboardingHeader items={[{ label: "Onboarding" }, { label: "Offer" }, { label: "Implemented Processes" }]} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-white">Implemented Processes</h1>
        <p className="mt-2 text-muted-foreground">Steps you implement and tools used.</p>
        <div className="mt-8">
          <ImplementedProcessesForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
