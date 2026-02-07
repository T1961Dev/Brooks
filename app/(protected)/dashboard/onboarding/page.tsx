import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { getStepData } from "@/lib/onboarding/data";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingEditView } from "./onboarding-edit-view";

export default async function DashboardOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const userId = await requireAuth();
  const { tab } = await searchParams;

  const business = await getStepData(userId, "business-assessment");
  const icpIntro = await getStepData(userId, "icp-introduction");
  const icpClients = await getStepData(userId, "icp-your-best-clients");
  const icpPatterns = await getStepData(userId, "icp-common-patterns");
  const icpAvoid = await getStepData(userId, "icp-clients-to-avoid");
  const offerIntro = await getStepData(userId, "offer-introduction");
  const offerResults = await getStepData(userId, "offer-specific-results");
  const offerProcesses = await getStepData(userId, "offer-implemented-processes");
  const offerIndustry = await getStepData(userId, "offer-industry-knowledge");
  const offerNetwork = await getStepData(userId, "offer-network-validation");
  const offerTrusted = await getStepData(userId, "offer-trusted-businesses");
  const offerCredibility = await getStepData(userId, "offer-credibility-leverage");
  const coldEmails = await getStepData(userId, "cold-emails");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit onboarding</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your business, ICP, offer, and cold email details at any time.</p>
      </header>
      <div className="flex-1 px-6 py-8 lg:px-8">
      <Suspense fallback={<Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>}>
        <OnboardingEditView
          defaultTab={tab ?? "business"}
          initialData={{
            business,
            icpIntro,
            icpClients,
            icpPatterns,
            icpAvoid,
            offerIntro,
            offerResults,
            offerProcesses,
            offerIndustry,
            offerNetwork,
            offerTrusted,
            offerCredibility,
            coldEmails,
          }}
        />
      </Suspense>
      </div>
    </div>
  );
}
