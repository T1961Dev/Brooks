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

const STEP_KEY: OnboardingStepKey = "offer-implemented-processes";

export function ImplementedProcessesForm({ initialData = {} }: { initialData?: Record<string, string> }) {
  const [steps, setSteps] = useState(initialData.steps ?? "");
  const [tools, setTools] = useState(initialData.tools ?? "");
  const [initialized, setInitialized] = useState(false);
  const save = async (p: Record<string, unknown>) => await saveOnboardingStep(STEP_KEY, p, true);
  const { scheduleSave } = useDebouncedSave(save);
  useEffect(() => setInitialized(true), []);
  useEffect(() => { if (initialized) scheduleSave({ steps, tools }); }, [steps, tools, initialized, scheduleSave]);

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Steps you implement</Label>
        <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Discovery, strategy, execution..." className="rounded-xl bg-muted border-border text-foreground min-h-[100px]" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Tools used</Label>
        <Textarea value={tools} onChange={(e) => setTools(e.target.value)} placeholder="CRM, email tools, etc." className="rounded-xl bg-muted border-border text-foreground min-h-[80px]" />
      </div>
      <div className="flex justify-end pt-4">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/offer/industry-knowledge">Next <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </FormCard>
  );
}
