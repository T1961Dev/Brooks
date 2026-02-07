"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function toList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ClientOnboardingForm({
  token,
  clientName,
}: {
  token: string;
  clientName: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [icpName, setIcpName] = useState(`${clientName} ICP`);
  const [headcountMin, setHeadcountMin] = useState("");
  const [headcountMax, setHeadcountMax] = useState("");
  const [revenueMin, setRevenueMin] = useState("");
  const [revenueMax, setRevenueMax] = useState("");
  const [jobTitles, setJobTitles] = useState("");
  const [industries, setIndustries] = useState("");
  const [geography, setGeography] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [technologies, setTechnologies] = useState("");

  const [offerSummary, setOfferSummary] = useState("");
  const [offerProof, setOfferProof] = useState("");
  const [offerPricing, setOfferPricing] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/client-onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          icp: {
            name: icpName,
            headcount_min: headcountMin ? Number(headcountMin) : null,
            headcount_max: headcountMax ? Number(headcountMax) : null,
            revenue_min: revenueMin ? Number(revenueMin) : null,
            revenue_max: revenueMax ? Number(revenueMax) : null,
            job_titles: toList(jobTitles),
            industries: toList(industries),
            geography,
            company_type: companyType,
            technologies: toList(technologies),
          },
          offer: {
            summary: offerSummary,
            proof: offerProof,
            pricing: offerPricing,
          },
          coldEmails: {},
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-10 text-center text-muted-foreground">
          Thanks! Your onboarding details were submitted to the agency.
        </CardContent>
      </Card>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Ideal Customer Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">ICP name</Label>
            <Input value={icpName} onChange={(e) => setIcpName(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Headcount min</Label>
            <Input value={headcountMin} onChange={(e) => setHeadcountMin(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Headcount max</Label>
            <Input value={headcountMax} onChange={(e) => setHeadcountMax(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Revenue min (USD)</Label>
            <Input value={revenueMin} onChange={(e) => setRevenueMin(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Revenue max (USD)</Label>
            <Input value={revenueMax} onChange={(e) => setRevenueMax(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">Job titles (comma separated)</Label>
            <Textarea value={jobTitles} onChange={(e) => setJobTitles(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">Industries (comma separated)</Label>
            <Textarea value={industries} onChange={(e) => setIndustries(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Geography</Label>
            <Input value={geography} onChange={(e) => setGeography(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Company type</Label>
            <Input value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">Technologies (comma separated)</Label>
            <Textarea value={technologies} onChange={(e) => setTechnologies(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Offer details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Offer summary</Label>
            <Textarea value={offerSummary} onChange={(e) => setOfferSummary(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Proof / case studies</Label>
            <Textarea value={offerProof} onChange={(e) => setOfferProof(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Pricing / constraints</Label>
            <Input value={offerPricing} onChange={(e) => setOfferPricing(e.target.value)} className="rounded-xl bg-muted border-border text-foreground" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="rounded-xl" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit onboarding"}
      </Button>
    </form>
  );
}
