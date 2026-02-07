"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormCard } from "@/components/form-card";
import { saveOnboardingStep } from "../../actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { ChevronRight } from "lucide-react";

const STEP_KEY: OnboardingStepKey = "offer-specific-results";

export function SpecificResultsForm({
  initialData = {},
}: {
  initialData?: { outcomes?: string[]; metrics?: string };
}) {
  const [outcomes, setOutcomes] = useState<string[]>(initialData.outcomes?.length ? initialData.outcomes : [""]);
  const [metrics, setMetrics] = useState(initialData.metrics ?? "");
  const [initialized, setInitialized] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    await saveOnboardingStep(STEP_KEY, payload, true);
  };
  const { scheduleSave } = useDebouncedSave(save);

  useEffect(() => setInitialized(true), []);
  useEffect(() => {
    if (!initialized) return;
    scheduleSave({ outcomes: outcomes.filter(Boolean), metrics });
  }, [outcomes, metrics, initialized, scheduleSave]);

  const updateOutcome = (i: number, v: string) => {
    setOutcomes((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };
  const addOutcome = () => setOutcomes((prev) => [...prev, ""]);
  const removeOutcome = (i: number) => setOutcomes((prev) => prev.filter((_, j) => j !== i));

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Outcomes (one per line or bullet)</Label>
        {outcomes.map((o, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={o}
              onChange={(e) => updateOutcome(i, e.target.value)}
              placeholder={`Outcome ${i + 1}`}
              className="rounded-xl bg-muted border-border text-foreground"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeOutcome(i)} className="text-muted-foreground shrink-0">
              ×
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addOutcome} className="rounded-xl border-border text-foreground">
          + Add outcome
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Quantified metrics</Label>
        <Textarea
          value={metrics}
          onChange={(e) => setMetrics(e.target.value)}
          placeholder="e.g. 2x pipeline in 90 days"
          className="rounded-xl bg-muted border-border text-foreground min-h-[80px]"
        />
      </div>
      <div className="flex justify-end pt-4">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/offer/implemented-processes">Next <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </FormCard>
  );
}
