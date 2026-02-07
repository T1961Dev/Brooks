"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormCard } from "@/components/form-card";
import { saveOnboardingStep } from "../../actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { ChevronRight } from "lucide-react";

const STEP_KEY: OnboardingStepKey = "offer-industry-knowledge";

export function IndustryKnowledgeForm({ initialData = {} }: { initialData?: Record<string, string> }) {
  const [industries, setIndustries] = useState(initialData.industries ?? "");
  const [proofPoints, setProofPoints] = useState(initialData.proofPoints ?? "");
  const [initialized, setInitialized] = useState(false);
  const save = async (p: Record<string, unknown>) => await saveOnboardingStep(STEP_KEY, p, true);
  const { scheduleSave } = useDebouncedSave(save);
  useEffect(() => setInitialized(true), []);
  useEffect(() => { if (initialized) scheduleSave({ industries, proofPoints }); }, [industries, proofPoints, initialized, scheduleSave]);

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Industries you understand</Label>
        <Textarea value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="SaaS, professional services..." className="rounded-xl bg-muted border-border text-foreground min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Proof points</Label>
        <Textarea value={proofPoints} onChange={(e) => setProofPoints(e.target.value)} placeholder="Certifications, results, experience..." className="rounded-xl bg-muted border-border text-foreground min-h-[100px]" />
      </div>
      <div className="flex justify-end pt-4">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/offer/network-validation">Next <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </FormCard>
  );
}
