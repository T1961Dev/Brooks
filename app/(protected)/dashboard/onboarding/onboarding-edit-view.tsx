"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormCard } from "@/components/form-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { saveOnboardingStep } from "@/app/(protected)/onboarding/actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";

const COMMON_RED_FLAGS = [
  "Price shoppers / only care about cost",
  "Analysis paralysis / slow decision makers",
  "No clear decision maker",
  "Unrealistic timelines",
  "Want guarantees before starting",
  "Previously burned by similar providers",
  "Too small (revenue/team)",
  "Wrong geography",
];

interface OnboardingEditViewProps {
  defaultTab: string;
  initialData: Record<string, unknown>;
}

export function OnboardingEditView({ defaultTab, initialData }: OnboardingEditViewProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") ?? defaultTab;
  const [tab, setTab] = useState(tabFromUrl);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-8">
      <TabsList className="bg-muted border border-border rounded-xl p-1.5 w-full sm:w-auto">
        <TabsTrigger value="business" className="rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground">Business</TabsTrigger>
        <TabsTrigger value="icp" className="rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground">ICP</TabsTrigger>
        <TabsTrigger value="offer" className="rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground">Offer</TabsTrigger>
        <TabsTrigger value="cold" className="rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground">Cold emails</TabsTrigger>
      </TabsList>

      <TabsContent value="business" className="mt-0 pt-2">
        <BusinessEditForm initialData={(initialData.business as Record<string, string>) ?? {}} />
      </TabsContent>
      <TabsContent value="icp" className="mt-0 pt-2">
        <IcpEditForm initialData={initialData} />
      </TabsContent>
      <TabsContent value="offer" className="mt-0 pt-2">
        <OfferEditForm initialData={initialData} />
      </TabsContent>
      <TabsContent value="cold" className="mt-0 pt-2">
        <ColdEmailsEditForm initialData={(initialData.coldEmails as Record<string, unknown>) ?? {}} />
      </TabsContent>
    </Tabs>
  );
}

function BusinessEditForm({ initialData }: { initialData: Record<string, string> }) {
  const [data, setData] = useState(initialData);
  const [init, setInit] = useState(false);
  const save = async (p: Record<string, unknown>) => await saveOnboardingStep("business-assessment", p, true);
  const { scheduleSave } = useDebouncedSave(save);
  useEffect(() => setInit(true), []);
  useEffect(() => { if (init) scheduleSave(data as unknown as Record<string, unknown>); }, [data, init, scheduleSave]);

  return (
    <FormCard className="space-y-5">
      {["companyName", "website", "whatYouSell", "primaryBuyerRole", "targetGeography", "currentOutboundStack", "currentLeadSources"].map((key) => (
        <div key={key} className="space-y-2">
          <Label className="text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
          <Input value={data[key] ?? ""} onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))} className="rounded-xl bg-muted border-border text-foreground" />
        </div>
      ))}
    </FormCard>
  );
}

function IcpEditForm({ initialData }: { initialData: Record<string, unknown> }) {
  const intro = (initialData.icpIntro as Record<string, string>) ?? {};
  const clients = (initialData.icpClients as { clients?: Array<{ industry: string; problem: string; results: string }> }) ?? {};
  const patterns = (initialData.icpPatterns as Record<string, string>) ?? {};
  const avoid = (initialData.icpAvoid as Record<string, unknown>) ?? {};

  const [niche, setNiche] = useState(intro.niche ?? "");
  const [buyer, setBuyer] = useState(intro.buyer ?? "");
  const [inCommon, setInCommon] = useState(patterns.inCommon ?? "");
  const [easyProfitable, setEasyProfitable] = useState(patterns.easyProfitable ?? "");
  const [minimumSolution, setMinimumSolution] = useState(patterns.minimumSolution ?? "");
  const [redFlags, setRedFlags] = useState((avoid.redFlags as string) ?? "");
  const [checkboxes, setCheckboxes] = useState<string[]>((avoid.checkboxes as string[]) ?? []);
  const [init, setInit] = useState(false);

  const saveIntro = async (p: Record<string, unknown>) => await saveOnboardingStep("icp-introduction", p, true);
  const savePatterns = async (p: Record<string, unknown>) => await saveOnboardingStep("icp-common-patterns", p, true);
  const saveAvoid = async (p: Record<string, unknown>) => await saveOnboardingStep("icp-clients-to-avoid", p, true);
  const { scheduleSave: scheduleIntro } = useDebouncedSave(saveIntro);
  const { scheduleSave: schedulePatterns } = useDebouncedSave(savePatterns);
  const { scheduleSave: scheduleAvoid } = useDebouncedSave(saveAvoid);

  useEffect(() => setInit(true), []);
  useEffect(() => { if (init) scheduleIntro({ niche, buyer }); }, [niche, buyer, init, scheduleIntro]);
  useEffect(() => { if (init) schedulePatterns({ inCommon, easyProfitable, minimumSolution }); }, [inCommon, easyProfitable, minimumSolution, init, schedulePatterns]);
  useEffect(() => { if (init) scheduleAvoid({ redFlags, checkboxes }); }, [redFlags, checkboxes, init, scheduleAvoid]);

  const toggleCheck = (label: string) => setCheckboxes((c) => c.includes(label) ? c.filter((x) => x !== label) : [...c, label]);

  return (
    <div className="space-y-10">
      <FormCard className="space-y-4">
        <h3 className="text-foreground font-semibold text-lg">Introduction</h3>
        <div className="space-y-4">
          <div><Label className="text-muted-foreground">Niche</Label><Input value={niche} onChange={(e) => setNiche(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground" /></div>
          <div><Label className="text-muted-foreground">Buyer</Label><Input value={buyer} onChange={(e) => setBuyer(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground" /></div>
        </div>
      </FormCard>
      <FormCard className="space-y-4">
        <h3 className="text-foreground font-semibold text-lg">Common patterns</h3>
        <div className="space-y-4">
          <div><Label className="text-muted-foreground">What they have in common</Label><Textarea value={inCommon} onChange={(e) => setInCommon(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground min-h-[80px]" /></div>
          <div><Label className="text-muted-foreground">Easy/profitable to work with</Label><Textarea value={easyProfitable} onChange={(e) => setEasyProfitable(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground min-h-[80px]" /></div>
          <div><Label className="text-muted-foreground">Minimum solution (MVP)</Label><Textarea value={minimumSolution} onChange={(e) => setMinimumSolution(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground min-h-[80px]" /></div>
        </div>
      </FormCard>
      <FormCard className="space-y-4">
        <h3 className="text-foreground font-semibold text-lg">Clients to avoid</h3>
        <Textarea value={redFlags} onChange={(e) => setRedFlags(e.target.value)} placeholder="Red flags..." className="rounded-xl bg-muted border-border text-foreground min-h-[80px]" />
        <div className="mt-3 space-y-2">
          {COMMON_RED_FLAGS.map((label) => (
            <label key={label} className="flex items-center gap-2 text-foreground cursor-pointer">
              <Checkbox checked={checkboxes.includes(label)} onCheckedChange={() => toggleCheck(label)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FormCard>
      <p className="text-muted-foreground text-sm pt-1">Your Best Clients: edit in onboarding flow or re-run ICP Agent to refresh.</p>
    </div>
  );
}

function OfferEditForm({ initialData }: { initialData: Record<string, unknown> }) {
  const intro = (initialData.offerIntro as Record<string, string>) ?? {};
  const [name, setName] = useState(intro.name ?? "");
  const [promise, setPromise] = useState(intro.promise ?? "");
  const [priceRange, setPriceRange] = useState(intro.priceRange ?? "");
  const [timeline, setTimeline] = useState(intro.timeline ?? "");
  const [steps, setSteps] = useState((initialData.offerProcesses as Record<string, string>)?.steps ?? "");
  const [tools, setTools] = useState((initialData.offerProcesses as Record<string, string>)?.tools ?? "");
  const [industries, setIndustries] = useState((initialData.offerIndustry as Record<string, string>)?.industries ?? "");
  const [proofPoints, setProofPoints] = useState((initialData.offerIndustry as Record<string, string>)?.proofPoints ?? "");
  const [init, setInit] = useState(false);

  const saveIntro = async (p: Record<string, unknown>) => await saveOnboardingStep("offer-introduction", p, true);
  const saveProcesses = async (p: Record<string, unknown>) => await saveOnboardingStep("offer-implemented-processes", p, true);
  const saveIndustry = async (p: Record<string, unknown>) => await saveOnboardingStep("offer-industry-knowledge", p, true);
  const { scheduleSave: s1 } = useDebouncedSave(saveIntro);
  const { scheduleSave: s2 } = useDebouncedSave(saveProcesses);
  const { scheduleSave: s3 } = useDebouncedSave(saveIndustry);

  useEffect(() => setInit(true), []);
  useEffect(() => { if (init) s1({ name, promise, priceRange, timeline }); }, [name, promise, priceRange, timeline, init, s1]);
  useEffect(() => { if (init) s2({ steps, tools }); }, [steps, tools, init, s2]);
  useEffect(() => { if (init) s3({ industries, proofPoints }); }, [industries, proofPoints, init, s3]);

  return (
    <div className="space-y-10">
      <FormCard className="space-y-4">
        <h3 className="text-foreground font-semibold text-lg">Introduction</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label className="text-muted-foreground">Offer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground" /></div>
          <div><Label className="text-muted-foreground">One line promise</Label><Input value={promise} onChange={(e) => setPromise(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground" /></div>
          <div><Label className="text-muted-foreground">Price range</Label><Input value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground" /></div>
          <div><Label className="text-muted-foreground">Timeline</Label><Input value={timeline} onChange={(e) => setTimeline(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground" /></div>
        </div>
      </FormCard>
      <FormCard className="space-y-4">
        <h3 className="text-foreground font-semibold text-lg">Implemented processes</h3>
        <div className="space-y-4">
          <div><Label className="text-muted-foreground">Steps</Label><Textarea value={steps} onChange={(e) => setSteps(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground min-h-[80px]" /></div>
          <div><Label className="text-muted-foreground">Tools</Label><Textarea value={tools} onChange={(e) => setTools(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground min-h-[60px]" /></div>
        </div>
      </FormCard>
      <FormCard>
        <h3 className="text-foreground font-semibold mb-3">Industry knowledge</h3>
        <div className="space-y-3">
          <div><Label className="text-muted-foreground">Industries</Label><Textarea value={industries} onChange={(e) => setIndustries(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground min-h-[60px]" /></div>
          <div><Label className="text-muted-foreground">Proof points</Label><Textarea value={proofPoints} onChange={(e) => setProofPoints(e.target.value)} className="mt-1 rounded-xl bg-muted border-border text-foreground min-h-[80px]" /></div>
        </div>
      </FormCard>
    </div>
  );
}

function ColdEmailsEditForm({ initialData }: { initialData: Record<string, unknown> }) {
  const [sendingDomain, setSendingDomain] = useState((initialData.sendingDomain as string) ?? "");
  const [fromName, setFromName] = useState((initialData.fromName as string) ?? "");
  const [targetTitles, setTargetTitles] = useState((initialData.targetTitles as string) ?? "");
  const [targetIndustries, setTargetIndustries] = useState((initialData.targetIndustries as string) ?? "");
  const [personalizationTokens, setPersonalizationTokens] = useState((initialData.personalizationTokens as string) ?? "{{first_name}}, {{company}}");
  const [init, setInit] = useState(false);
  const save = async (p: Record<string, unknown>) => await saveOnboardingStep("cold-emails", { ...initialData, ...p, sequence: initialData.sequence }, !!initialData.sequence);
  const { scheduleSave } = useDebouncedSave(save);
  useEffect(() => setInit(true), []);
  useEffect(() => {
    if (!init) return;
    scheduleSave({ sendingDomain, fromName, targetTitles, targetIndustries, personalizationTokens });
  }, [sendingDomain, fromName, targetTitles, targetIndustries, personalizationTokens, init, scheduleSave]);

  return (
    <FormCard className="space-y-5">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Sending domain</Label>
        <Input value={sendingDomain} onChange={(e) => setSendingDomain(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">From name</Label>
        <Input value={fromName} onChange={(e) => setFromName(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Target titles (comma-separated)</Label>
        <Input value={targetTitles} onChange={(e) => setTargetTitles(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Target industries</Label>
        <Input value={targetIndustries} onChange={(e) => setTargetIndustries(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Personalization tokens</Label>
        <Input value={personalizationTokens} onChange={(e) => setPersonalizationTokens(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">Chosen angle and sequence are saved from the onboarding Cold Emails step. Re-run that step to regenerate.</p>
    </FormCard>
  );
}
