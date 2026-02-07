"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveOnboardingStep } from "../actions";

export function CompleteView({ hasSequence }: { hasSequence: boolean }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const handleStartLeadScrape = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/apify/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      await saveOnboardingStep("complete", { started: true }, true);
      await fetch("/api/onboarding-complete", { method: "POST" });
      router.push("/leads?scrape=started");
      router.refresh();
    } catch (e) {
      setStarting(false);
    }
  };

  const handleGoToDashboard = async () => {
    await saveOnboardingStep("complete", {}, true);
    await fetch("/api/onboarding-complete", { method: "POST" });
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-center">
      <h1 className="text-3xl font-bold text-white">You&apos;re all set</h1>
      <p className="mt-2 text-muted-foreground">
        Summary of your onboarding. Start lead scraping or go to the dashboard.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={handleStartLeadScrape}
          disabled={!hasSequence || starting}
          className="rounded-xl px-8"
        >
          {starting ? "Starting…" : "Start lead scrape"}
        </Button>
        <Button onClick={handleGoToDashboard} variant="outline" className="rounded-xl border-border text-foreground hover:bg-muted/50">
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
