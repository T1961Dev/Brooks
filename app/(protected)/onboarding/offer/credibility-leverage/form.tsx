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

const STEP_KEY: OnboardingStepKey = "offer-credibility-leverage";

export function CredibilityLeverageForm({ initialData = {} }: { initialData?: Record<string, string> }) {
  const [founderStory, setFounderStory] = useState(initialData.founderStory ?? "");
  const [proofAssets, setProofAssets] = useState(initialData.proofAssets ?? "");
  const [testimonials, setTestimonials] = useState(initialData.testimonials ?? "");
  const [initialized, setInitialized] = useState(false);
  const save = async (p: Record<string, unknown>) => await saveOnboardingStep(STEP_KEY, p, true);
  const { scheduleSave } = useDebouncedSave(save);
  useEffect(() => setInitialized(true), []);
  useEffect(() => { if (initialized) scheduleSave({ founderStory, proofAssets, testimonials }); }, [founderStory, proofAssets, testimonials, initialized, scheduleSave]);

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Founder story</Label>
        <Textarea value={founderStory} onChange={(e) => setFounderStory(e.target.value)} placeholder="Your background and why you do this..." className="rounded-xl bg-muted border-border text-foreground min-h-[100px]" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Proof assets</Label>
        <Textarea value={proofAssets} onChange={(e) => setProofAssets(e.target.value)} placeholder="Awards, press, metrics..." className="rounded-xl bg-muted border-border text-foreground min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Testimonials</Label>
        <Textarea value={testimonials} onChange={(e) => setTestimonials(e.target.value)} placeholder="Quotes or summary of social proof..." className="rounded-xl bg-muted border-border text-foreground min-h-[100px]" />
      </div>
      <div className="flex justify-end pt-4">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/offer/offer-agent">Next <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </FormCard>
  );
}
