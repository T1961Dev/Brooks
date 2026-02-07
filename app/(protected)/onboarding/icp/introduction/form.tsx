"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCard } from "@/components/form-card";
import { saveOnboardingStep } from "../../actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { ChevronRight } from "lucide-react";

const STEP_KEY: OnboardingStepKey = "icp-introduction";

export function IcpIntroductionForm({
  initialData = {},
}: {
  initialData?: Record<string, string>;
}) {
  const [niche, setNiche] = useState(initialData.niche ?? "");
  const [buyer, setBuyer] = useState(initialData.buyer ?? "");
  const [initialized, setInitialized] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    await saveOnboardingStep(STEP_KEY, payload, true);
  };
  const { scheduleSave } = useDebouncedSave(save);

  useEffect(() => setInitialized(true), []);
  useEffect(() => {
    if (!initialized) return;
    scheduleSave({ niche, buyer });
  }, [niche, buyer, initialized, scheduleSave]);

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Niche</Label>
        <Input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. B2B SaaS, 10-50 employees"
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Buyer</Label>
        <Input
          value={buyer}
          onChange={(e) => setBuyer(e.target.value)}
          placeholder="e.g. VP Sales, Head of Marketing"
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex justify-end pt-4">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/icp/your-best-clients">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </FormCard>
  );
}
