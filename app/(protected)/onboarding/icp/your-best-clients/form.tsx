"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormCard } from "@/components/form-card";
import { saveOnboardingStep } from "../../actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import { ChevronRight } from "lucide-react";

const STEP_KEY: OnboardingStepKey = "icp-your-best-clients";

interface ClientRow {
  industry: string;
  problem: string;
  results: string;
}

export function YourBestClientsForm({
  initialData = {},
}: {
  initialData?: { clients?: ClientRow[] };
}) {
  const [clients, setClients] = useState<ClientRow[]>(
    initialData.clients?.length ? initialData.clients : [{ industry: "", problem: "", results: "" }]
  );
  const [initialized, setInitialized] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    await saveOnboardingStep(STEP_KEY, payload, true);
  };
  const { scheduleSave } = useDebouncedSave(save);

  useEffect(() => setInitialized(true), []);
  useEffect(() => {
    if (!initialized) return;
    scheduleSave({ clients });
  }, [clients, initialized, scheduleSave]);

  const update = (i: number, key: keyof ClientRow, value: string) => {
    setClients((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  };

  const add = () => {
    setClients((prev) => [...prev, { industry: "", problem: "", results: "" }]);
  };

  return (
    <div className="space-y-8">
      {clients.map((c, i) => (
        <FormCard key={i} title={`Client ${i + 1}`}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Industry/Niche</Label>
              <Input
                value={c.industry}
                onChange={(e) => update(i, "industry", e.target.value)}
                placeholder="SaaS company, 5m revenue, 20 employees"
                className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Problem (Thorn in Their Foot)</Label>
              <Textarea
                value={c.problem}
                onChange={(e) => update(i, "problem", e.target.value)}
                placeholder="No leads, struggling to scale outbound"
                className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Results Achieved</Label>
              <Textarea
                value={c.results}
                onChange={(e) => update(i, "results", e.target.value)}
                placeholder="1m pipeline in 30 days"
                className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
              />
            </div>
          </div>
        </FormCard>
      ))}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={add}
          className="rounded-xl border-border bg-transparent text-foreground hover:bg-muted/50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Client
        </Button>
      </div>
      <div className="flex justify-end">
        <Button asChild className="rounded-xl">
          <Link href="/onboarding/icp/common-patterns">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
