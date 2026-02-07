"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormCard } from "@/components/form-card";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { ChevronRight } from "lucide-react";

const STEP_KEY: OnboardingStepKey = "cold-emails";

const DEFAULT_ANGLES = [
  "Results angle: We help similar companies achieve measurable results.",
  "Process angle: We use a proven process so you get outcomes without the guesswork.",
  "Proof angle: Trusted by businesses in your space. Case studies available.",
  "Speed angle: Get from where you are to where you want to be in 60-90 days.",
  "Founder angle: Direct access to the team that delivers.",
];

function generateSequence(
  chosenAngle: string,
  fromName: string,
  personalizationTokens: string
): { emails: Array<{ subject: string; body: string }> } {
  const tokens = personalizationTokens ? personalizationTokens.split(",").map((t) => t.trim()) : [];
  const first = tokens[0] || "{{first_name}}";
  const company = tokens[1] || "{{company}}";
  return {
    emails: [
      {
        subject: `${first}, quick question`,
        body: `Hi ${first},\n\n${chosenAngle.slice(0, 120)}...\n\nBest,\n${fromName}`,
      },
      {
        subject: `Re: ${first}, quick question`,
        body: `Hi ${first},\n\nFollowing up – would one short call this week make sense?\n\n${fromName}`,
      },
      {
        subject: `Last try ${first}`,
        body: `Hi ${first},\n\nI'll leave you alone after this. If you'd like to explore working together, reply or book here: [link].\n\n${fromName}`,
      },
    ],
  };
}

export function ColdEmailsForm({
  initialData = {},
  angles = [],
  clients,
  clientId,
}: {
  initialData?: {
    chosenAngle?: string;
    sendingDomain?: string;
    fromName?: string;
    targetTitles?: string;
    targetIndustries?: string;
    personalizationTokens?: string;
    sequence?: { emails: Array<{ subject: string; body: string }> };
  };
  angles?: string[];
  clients: Array<{ id: string; name: string }>;
  clientId: string | null;
}) {
  const router = useRouter();
  const optionAngles = angles.length ? angles : DEFAULT_ANGLES;
  const [activeClientId, setActiveClientId] = useState(clientId ?? "");
  const [chosenAngle, setChosenAngle] = useState(initialData.chosenAngle ?? optionAngles[0] ?? "");
  const [sendingDomain, setSendingDomain] = useState(initialData.sendingDomain ?? "");
  const [fromName, setFromName] = useState(initialData.fromName ?? "");
  const [targetTitles, setTargetTitles] = useState(initialData.targetTitles ?? "");
  const [targetIndustries, setTargetIndustries] = useState(initialData.targetIndustries ?? "");
  const [personalizationTokens, setPersonalizationTokens] = useState(initialData.personalizationTokens ?? "{{first_name}}, {{company}}");
  const [sequence, setSequence] = useState(initialData.sequence ?? null);
  const [initialized, setInitialized] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    if (!activeClientId) return;
    await fetch("/api/clients/cold-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: activeClientId, data: payload }),
    });
  };
  const { scheduleSave, flush } = useDebouncedSave(save);

  useEffect(() => setInitialized(true), []);
  useEffect(() => {
    if (!initialized) return;
    scheduleSave({
      chosenAngle,
      sendingDomain,
      fromName,
      targetTitles,
      targetIndustries,
      personalizationTokens,
      sequence,
    });
  }, [
    chosenAngle,
    sendingDomain,
    fromName,
    targetTitles,
    targetIndustries,
    personalizationTokens,
    sequence,
    initialized,
    scheduleSave,
    activeClientId,
  ]);

  const handleGenerate = () => {
    if (!activeClientId) return;
    const seq = generateSequence(chosenAngle, fromName || "Team", personalizationTokens);
    setSequence(seq);
    flush();
    save({
      chosenAngle,
      sendingDomain,
      fromName,
      targetTitles,
      targetIndustries,
      personalizationTokens,
      sequence: seq,
    });
  };

  return (
    <div className="space-y-8">
      {clients.length > 0 ? (
        <FormCard>
          <Label className="text-muted-foreground">Client</Label>
          <select
            value={activeClientId}
            onChange={(e) => {
              const next = e.target.value;
              setActiveClientId(next);
              router.push(`/onboarding/cold-emails?clientId=${encodeURIComponent(next)}`);
            }}
            className="mt-2 w-full rounded-xl bg-muted border border-border text-foreground px-3 py-2"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </FormCard>
      ) : (
        <FormCard>
          <p className="text-sm text-muted-foreground">
            Create a client first to build a cold email sequence.
          </p>
        </FormCard>
      )}
      <FormCard>
        <Label className="text-muted-foreground">Choose an angle</Label>
        <select
          value={chosenAngle}
          onChange={(e) => setChosenAngle(e.target.value)}
          className="mt-2 w-full rounded-xl bg-muted border border-border text-foreground px-3 py-2"
        >
          {optionAngles.map((a, i) => (
            <option key={i} value={a}>{a.slice(0, 60)}...</option>
          ))}
        </select>
      </FormCard>
      <FormCard>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Sending domain</Label>
            <Input value={sendingDomain} onChange={(e) => setSendingDomain(e.target.value)} placeholder="company.com" className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">From name</Label>
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Jane" className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Target titles (comma-separated)</Label>
            <Input value={targetTitles} onChange={(e) => setTargetTitles(e.target.value)} placeholder="VP Sales, Head of Marketing" className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Target industries</Label>
            <Input value={targetIndustries} onChange={(e) => setTargetIndustries(e.target.value)} placeholder="SaaS, Professional services" className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Personalization tokens (comma-separated)</Label>
            <Input value={personalizationTokens} onChange={(e) => setPersonalizationTokens(e.target.value)} placeholder="{{first_name}}, {{company}}" className="rounded-xl bg-muted border-border text-foreground" />
          </div>
        </div>
      </FormCard>
      <div className="flex justify-between items-center">
        <Button type="button" onClick={handleGenerate} className="rounded-xl" disabled={!activeClientId}>
          Generate sequence
        </Button>
        <Button asChild className="rounded-xl" disabled={!sequence}>
          <Link href="/onboarding/complete">Next <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
      {sequence && (
        <FormCard title="Your sequence">
          {sequence.emails.map((e, i) => (
            <div key={i} className="mb-4 pb-4 border-b border-border last:border-0">
              <p className="text-muted-foreground text-sm">Email {i + 1}</p>
              <p className="font-medium text-foreground">Subject: {e.subject}</p>
              <pre className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{e.body}</pre>
            </div>
          ))}
        </FormCard>
      )}
    </div>
  );
}
