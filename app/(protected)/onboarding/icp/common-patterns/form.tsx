"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormCard } from "@/components/form-card";
import { saveOnboardingStep } from "../../actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEP_KEY: OnboardingStepKey = "icp-common-patterns";

export function CommonPatternsForm({
  initialData = {},
}: {
  initialData?: { inCommon?: string; easyProfitable?: string; minimumSolution?: string };
}) {
  const [inCommon, setInCommon] = useState(initialData.inCommon ?? "");
  const [easyProfitable, setEasyProfitable] = useState(initialData.easyProfitable ?? "");
  const [minimumSolution, setMinimumSolution] = useState(initialData.minimumSolution ?? "");
  const [initialized, setInitialized] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    await saveOnboardingStep(STEP_KEY, payload, true);
  };
  const { scheduleSave } = useDebouncedSave(save);

  useEffect(() => setInitialized(true), []);
  useEffect(() => {
    if (!initialized) return;
    scheduleSave({
      inCommon,
      easyProfitable,
      minimumSolution,
    });
  }, [inCommon, easyProfitable, minimumSolution, initialized, scheduleSave]);

  return (
    <div className="space-y-8">
      <FormCard>
        <h3 className="text-lg font-semibold text-foreground">What do these clients have in common?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Look for patterns in industry, company size, revenue, location, mindset, years in business, attitude toward investment, etc.
        </p>
        <div className="mt-4">
          <Textarea
            value={inCommon}
            onChange={(e) => setInCommon(e.target.value)}
            placeholder="Service-based businesses, $1M-$10M revenue..."
            className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[120px]"
          />
        </div>
      </FormCard>
      <FormCard>
        <h3 className="text-lg font-semibold text-foreground">What made them easy/profitable to work with?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          What characteristics made these clients successful, compliant, low-maintenance, or highly profitable?
        </p>
        <div className="mt-4">
          <Textarea
            value={easyProfitable}
            onChange={(e) => setEasyProfitable(e.target.value)}
            placeholder="Implemented suggestions immediately..."
            className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[120px]"
          />
        </div>
      </FormCard>
      <FormCard>
        <h3 className="text-lg font-semibold text-foreground">What was the minimum solution (MVP) that worked for them?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          What core solution or set of services consistently solved their problem? Strip away the extras.
        </p>
        <div className="mt-4">
          <Textarea
            value={minimumSolution}
            onChange={(e) => setMinimumSolution(e.target.value)}
            placeholder="Core offering that delivered results..."
            className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[120px]"
          />
        </div>
      </FormCard>
      <div className="flex justify-end">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/icp/clients-to-avoid">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
