import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { ClientsToAvoidForm } from "./form";

export default async function ClientsToAvoidPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<{ redFlags?: string; checkboxes?: string[] }>(userId, "icp-clients-to-avoid");

  return (
    <>
      <OnboardingHeader
        items={[
          { label: "Onboarding", href: "/onboarding/icp/introduction" },
          { label: "ICP", href: "/onboarding/icp/clients-to-avoid" },
          { label: "Clients to Avoid" },
        ]}
      />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Clients to Avoid</h1>
        <p className="mt-2 text-muted-foreground">
          Describe red flags and types of clients you prefer not to work with.
        </p>
        <div className="mt-8">
          <ClientsToAvoidForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
