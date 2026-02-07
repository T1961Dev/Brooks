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

const STEP_KEY: OnboardingStepKey = "offer-network-validation";

export function NetworkValidationForm({ initialData = {} }: { initialData?: Record<string, string> }) {
  const [communities, setCommunities] = useState(initialData.communities ?? "");
  const [partnerships, setPartnerships] = useState(initialData.partnerships ?? "");
  const [initialized, setInitialized] = useState(false);
  const save = async (p: Record<string, unknown>) => await saveOnboardingStep(STEP_KEY, p, true);
  const { scheduleSave } = useDebouncedSave(save);
  useEffect(() => setInitialized(true), []);
  useEffect(() => { if (initialized) scheduleSave({ communities, partnerships }); }, [communities, partnerships, initialized, scheduleSave]);

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Communities</Label>
        <Textarea value={communities} onChange={(e) => setCommunities(e.target.value)} placeholder="Industry groups, associations..." className="rounded-xl bg-muted border-border text-foreground min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Partnerships</Label>
        <Textarea value={partnerships} onChange={(e) => setPartnerships(e.target.value)} placeholder="Key partners..." className="rounded-xl bg-muted border-border text-foreground min-h-[80px]" />
      </div>
      <div className="flex justify-end pt-4">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/offer/trusted-businesses">Next <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </FormCard>
  );
}
