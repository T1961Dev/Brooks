"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormCard } from "@/components/form-card";
import { Checkbox } from "@/components/ui/checkbox";
import { saveOnboardingStep } from "../../actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEP_KEY: OnboardingStepKey = "icp-clients-to-avoid";

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

export function ClientsToAvoidForm({
  initialData = {},
}: {
  initialData?: { redFlags?: string; checkboxes?: string[] };
}) {
  const [redFlags, setRedFlags] = useState(initialData.redFlags ?? "");
  const [checkboxes, setCheckboxes] = useState<string[]>(initialData.checkboxes ?? []);
  const [initialized, setInitialized] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    await saveOnboardingStep(STEP_KEY, payload, true);
  };
  const { scheduleSave } = useDebouncedSave(save);

  useEffect(() => setInitialized(true), []);
  useEffect(() => {
    if (!initialized) return;
    scheduleSave({ redFlags, checkboxes });
  }, [redFlags, checkboxes, initialized, scheduleSave]);

  const toggle = (label: string) => {
    setCheckboxes((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  return (
    <div className="space-y-8">
      <FormCard>
        <Label className="text-muted-foreground">Red flags (free text)</Label>
        <Textarea
          value={redFlags}
          onChange={(e) => setRedFlags(e.target.value)}
          placeholder="Clients who..."
          className="mt-2 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[100px]"
        />
      </FormCard>
      <FormCard>
        <h3 className="text-lg font-semibold text-foreground mb-4">Common red flags</h3>
        <div className="space-y-3">
          {COMMON_RED_FLAGS.map((label) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer text-foreground">
              <Checkbox
                checked={checkboxes.includes(label)}
                onCheckedChange={() => toggle(label)}
                className="border-border"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FormCard>
      <div className="flex justify-end">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/icp/icp-agent">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
