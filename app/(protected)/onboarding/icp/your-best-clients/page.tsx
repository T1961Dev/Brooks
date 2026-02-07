import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { OnboardingHeader } from "@/components/onboarding-header";
import { YourBestClientsForm } from "./form";

export default async function YourBestClientsPage() {
  const userId = await requireAuth();
  const initialData = await getStepData<{ clients?: Array<{ industry: string; problem: string; results: string }> }>(userId, "icp-your-best-clients");

  return (
    <>
      <OnboardingHeader
        items={[
          { label: "Onboarding", href: "/onboarding/icp/introduction" },
          { label: "ICP", href: "/onboarding/icp/your-best-clients" },
          { label: "Your Best Clients" },
        ]}
      />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground text-center">Your Best Clients</h1>
        <p className="mt-2 text-muted-foreground text-center max-w-xl mx-auto">
          Add 3-5 of your best clients. For each, describe their industry/niche, the specific problem they had (the &quot;thorn in their foot&quot;), and the results they achieved.
        </p>
        <div className="mt-8">
          <YourBestClientsForm initialData={initialData} />
        </div>
      </div>
    </>
  );
}
