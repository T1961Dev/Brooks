"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCard } from "@/components/form-card";
import { saveOnboardingStep } from "../actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { ChevronRight } from "lucide-react";

const STEP_KEY: OnboardingStepKey = "business-assessment";

interface FormState {
  companyName: string;
  website: string;
  whatYouSell: string;
  primaryBuyerRole: string;
  targetGeography: string;
  currentOutboundStack: string;
  currentLeadSources: string;
}

const defaultState: FormState = {
  companyName: "",
  website: "",
  whatYouSell: "",
  primaryBuyerRole: "",
  targetGeography: "",
  currentOutboundStack: "",
  currentLeadSources: "",
};

export function BusinessAssessmentForm({
  initialData = {},
  editMode,
}: {
  initialData?: Record<string, string>;
  editMode?: boolean;
}) {
  const [data, setData] = useState<FormState>(() => ({
    ...defaultState,
    ...(initialData as Partial<FormState>),
  }));
  const [initialized, setInitialized] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    await saveOnboardingStep(STEP_KEY, payload, true);
  };
  const { scheduleSave } = useDebouncedSave(save);

  useEffect(() => {
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    scheduleSave(data as unknown as Record<string, unknown>);
  }, [data, initialized, scheduleSave]);

  const update = (key: keyof FormState, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const nextPath = "/onboarding/icp/introduction";
  // Avoid dependency on getNextUnlockedPath from client

  return (
    <FormCard className="space-y-6">
      <div className="space-y-2">
        <Label className="text-muted-foreground">Company name</Label>
        <Input
          value={data.companyName}
          onChange={(e) => update("companyName", e.target.value)}
          placeholder="Acme Inc"
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Website</Label>
        <Input
          value={data.website}
          onChange={(e) => update("website", e.target.value)}
          placeholder="https://acme.com"
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">What you sell in one sentence</Label>
        <Input
          value={data.whatYouSell}
          onChange={(e) => update("whatYouSell", e.target.value)}
          placeholder="We help B2B companies generate qualified leads."
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Primary buyer role</Label>
        <Input
          value={data.primaryBuyerRole}
          onChange={(e) => update("primaryBuyerRole", e.target.value)}
          placeholder="VP Sales, Head of Marketing"
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Target geography</Label>
        <Input
          value={data.targetGeography}
          onChange={(e) => update("targetGeography", e.target.value)}
          placeholder="US, UK, DACH"
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Current outbound stack (optional)</Label>
        <Input
          value={data.currentOutboundStack}
          onChange={(e) => update("currentOutboundStack", e.target.value)}
          placeholder="Instantly, Apollo, etc."
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Current lead sources (optional)</Label>
        <Input
          value={data.currentLeadSources}
          onChange={(e) => update("currentLeadSources", e.target.value)}
          placeholder="LinkedIn, cold email, events"
          className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
      {!editMode && (
        <div className="flex justify-end pt-4">
          <Button asChild className="rounded-xl">
            <Link href={nextPath}>
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </FormCard>
  );
}
