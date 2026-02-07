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

const STEP_KEY: OnboardingStepKey = "offer-trusted-businesses";

export function TrustedBusinessesForm({ initialData = {} }: { initialData?: Record<string, string> }) {
  const [logos, setLogos] = useState(initialData.logos ?? "");
  const [caseStudies, setCaseStudies] = useState(initialData.caseStudies ?? "");
  const [initialized, setInitialized] = useState(false);
  const save = async (p: Record<string, unknown>) => await saveOnboardingStep(STEP_KEY, p, true);
  const { scheduleSave } = useDebouncedSave(save);
  useEffect(() => setInitialized(true), []);
  useEffect(() => { if (initialized) scheduleSave({ logos, caseStudies }); }, [logos, caseStudies, initialized, scheduleSave]);

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Logos (company names as text)</Label>
        <Textarea value={logos} onChange={(e) => setLogos(e.target.value)} placeholder="Company A, Company B..." className="rounded-xl bg-muted border-border text-foreground min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Case studies list</Label>
        <Textarea value={caseStudies} onChange={(e) => setCaseStudies(e.target.value)} placeholder="Brief case study titles or links..." className="rounded-xl bg-muted border-border text-foreground min-h-[100px]" />
      </div>
      <div className="flex justify-end pt-4">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/offer/credibility-leverage">Next <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </FormCard>
  );
}
