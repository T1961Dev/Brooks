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

const STEP_KEY: OnboardingStepKey = "offer-introduction";

export function OfferIntroductionForm({ initialData = {} }: { initialData?: Record<string, string> }) {
  const [name, setName] = useState(initialData.name ?? "");
  const [promise, setPromise] = useState(initialData.promise ?? "");
  const [priceRange, setPriceRange] = useState(initialData.priceRange ?? "");
  const [timeline, setTimeline] = useState(initialData.timeline ?? "");
  const [initialized, setInitialized] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    await saveOnboardingStep(STEP_KEY, payload, true);
  };
  const { scheduleSave } = useDebouncedSave(save);

  useEffect(() => setInitialized(true), []);
  useEffect(() => {
    if (!initialized) return;
    scheduleSave({ name, promise, priceRange, timeline });
  }, [name, promise, priceRange, timeline, initialized, scheduleSave]);

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Offer name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Growth Accelerator"
          className="rounded-xl bg-muted border-border text-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">One line promise</Label>
        <Input
          value={promise}
          onChange={(e) => setPromise(e.target.value)}
          placeholder="We help you get X without Y"
          className="rounded-xl bg-muted border-border text-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Price point range</Label>
        <Input
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
          placeholder="e.g. $5k–$15k"
          className="rounded-xl bg-muted border-border text-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Delivery timeline</Label>
        <Input
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          placeholder="e.g. 60-90 days"
          className="rounded-xl bg-muted border-border text-foreground"
        />
      </div>
      <div className="flex justify-end pt-4">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/offer/specific-results">Next <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </FormCard>
  );
}
