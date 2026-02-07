"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { AgentStepCard } from "@/components/agent-step-card";
import { BottomActions } from "@/components/bottom-actions";
import { ICP_AGENT_STEPS } from "@/lib/agents/icp";

type StepState = "pending" | "active" | "completed";

export function IcpAgentView() {
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "succeeded" | "failed">("idle");
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const poll = useCallback(async () => {
    if (!runId) return;
    const res = await fetch(`/api/agent/icp/status?runId=${encodeURIComponent(runId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setStatus(data.status);
    setCurrentStep(data.currentStep ?? null);
    setProgress(data.progress ?? 0);
  }, [runId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const startRes = await fetch("/api/agent/icp/start", { method: "POST" });
      if (!startRes.ok || !mounted) return;
      const startData = await startRes.json();
      setRunId(startData.runId);
      setStatus(startData.status ?? "running");
      if (startData.status === "succeeded") {
        setProgress(100);
        setCurrentStep(ICP_AGENT_STEPS[ICP_AGENT_STEPS.length - 1].key);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (status !== "running" && status !== "idle") return;
    poll();
    const t = setInterval(poll, 1000);
    return () => clearInterval(t);
  }, [status, poll]);

  const currentStepIndex = currentStep
    ? ICP_AGENT_STEPS.findIndex((s) => s.key === currentStep)
    : -1;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex flex-col items-center text-center mb-10">
        <Sparkles className="h-8 w-8 text-foreground mb-3" />
        <h1 className="text-3xl font-bold text-foreground">
          AI is creating your Ideal Customer Profile
        </h1>
        <p className="mt-2 text-muted-foreground">
          This process typically takes 1-3 minutes to complete.
        </p>
      </div>

      <div className="space-y-4">
        {ICP_AGENT_STEPS.map((step, i) => {
          let state: StepState = "pending";
          if (status === "succeeded" && i <= currentStepIndex) state = "completed";
          else if (status === "succeeded" && i === ICP_AGENT_STEPS.length - 1) state = "completed";
          else if (currentStep === step.key) state = "active";
          else if (currentStepIndex >= 0 && i < currentStepIndex) state = "completed";

          const progressPercent =
            state === "active" ? progress : state === "completed" ? 100 : 0;

          return (
            <AgentStepCard
              key={step.key}
              title={step.label}
              description={step.description}
              pill={step.pill}
              state={state}
              progressPercent={progressPercent}
            />
          );
        })}
      </div>

      <BottomActions
        backHref="/onboarding/icp/clients-to-avoid"
        onRerun={
          status === "succeeded"
            ? async () => {
                await fetch("/api/agent/icp/start?forceNew=1", { method: "POST" });
                window.location.reload();
              }
            : undefined
        }
        rerunLabel="Rerun Agent"
        nextHref={status === "succeeded" ? "/onboarding/offer/introduction" : null}
        nextDisabled={status !== "succeeded"}
      />
    </div>
  );
}
