"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatIcpSummary } from "@/lib/icp-summary";
import {
  ICP_JOB_TITLES,
  ICP_INDUSTRIES,
  HEADCOUNT_BRACKETS,
  REVENUE_THRESHOLDS,
  GEOGRAPHY_OPTIONS,
  COMPANY_TYPES,
  TECH_OPTIONS,
} from "@/lib/icp-options";
import { ChevronDown, X, Users, Building2, MapPin, Briefcase, DollarSign, Cpu, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type IcpProfile = {
  id: string;
  client_id: string | null;
  name: string;
  headcount_brackets: string[] | null;
  headcount_min: number | null;
  headcount_max: number | null;
  revenue_min: number | null;
  revenue_max: number | null;
  job_titles: string[] | null;
  industries: string[] | null;
  geography: string | null;
  company_type: string | null;
  technologies: string[] | null;
  created_at: string;
};

type Client = { id: string; name: string };

function ChipSelector({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
  description,
}: {
  label: string;
  icon: React.ElementType;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  description?: string;
}) {
  const [isOpen, setIsOpen] = useState(selected.size > 0);
  const selectedCount = selected.size;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="font-medium text-foreground">{label}</span>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                {selectedCount} selected
              </Badge>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-4">
          {options.map((opt) => {
            const isSelected = selected.has(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(opt)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {opt}
                {isSelected && <X className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function IcpView({
  initialIcps,
  initialClients,
  selectedClientId,
}: {
  initialIcps: IcpProfile[];
  initialClients: Client[];
  selectedClientId: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const clientId = selectedClientId ?? initialClients[0]?.id ?? "";
  const [name, setName] = useState("");
  const [headcountSet, setHeadcountSet] = useState<Set<string>>(new Set());
  const [revenueMin, setRevenueMin] = useState<string>("");
  const [revenueMax, setRevenueMax] = useState<string>("");
  const [jobTitleSet, setJobTitleSet] = useState<Set<string>>(new Set());
  const [industrySet, setIndustrySet] = useState<Set<string>>(new Set());
  const [geography, setGeography] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [techSet, setTechSet] = useState<Set<string>>(new Set());

  const toggleSet = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const selectedHeadcounts = HEADCOUNT_BRACKETS.filter((b) =>
      headcountSet.has(b.label)
    );
    const hbMin =
      selectedHeadcounts.length > 0
        ? Math.min(...selectedHeadcounts.map((b) => b.min))
        : null;
    const hbMax =
      selectedHeadcounts.length > 0
        ? selectedHeadcounts.some((b) => b.max == null)
          ? null
          : Math.max(...selectedHeadcounts.map((b) => b.max as number))
        : null;
    const rbMin = revenueMin ? Number(revenueMin) : null;
    const rbMax = revenueMax ? Number(revenueMax) : null;
    try {
      const res = await fetch("/api/icp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          name,
          headcount_brackets: Array.from(headcountSet),
          headcount_min: hbMin,
          headcount_max: hbMax,
          revenue_min: rbMin,
          revenue_max: rbMax,
          job_titles: Array.from(jobTitleSet),
          industries: Array.from(industrySet),
          geography: geography || null,
          company_type: companyType || null,
          technologies: Array.from(techSet),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
      setName("");
      setHeadcountSet(new Set());
      setRevenueMin("");
      setRevenueMax("");
      setJobTitleSet(new Set());
      setIndustrySet(new Set());
      setGeography("");
      setCompanyType("");
      setTechSet(new Set());
    } finally {
      setSaving(false);
    }
  };

  if (initialClients.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>ICP Builder</CardTitle>
              <CardDescription>Define ideal customer profiles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Create a client first so ICPs can be linked to the correct account.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/clients")}
            >
              Go to Clients
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const clientName = initialClients.find((c) => c.id === clientId)?.name ?? "Unknown";

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Create ICP</CardTitle>
                <CardDescription>Define targeting criteria for {clientName}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {clientName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* ICP Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ICP Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mid-market SaaS CTOs"
                className="h-11 rounded-lg bg-muted/50 border-border"
                required
              />
            </div>

            {/* Company Size Filters */}
            <div className="space-y-3">
              <ChipSelector
                label="Headcount"
                icon={Users}
                options={HEADCOUNT_BRACKETS.map((b) => b.label)}
                selected={headcountSet}
                onToggle={(k) => setHeadcountSet((s) => toggleSet(s, k))}
                description="Select one or more company size brackets"
              />
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-foreground">Revenue</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Set min and max annual revenue</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={revenueMin || "_any"}
                    onValueChange={(v) => setRevenueMin(v === "_any" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 w-[110px] rounded-lg bg-card border-border text-sm">
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any">No min</SelectItem>
                      {REVENUE_THRESHOLDS.map((t) => (
                        <SelectItem key={`min-${t.value}`} value={String(t.value)}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">to</span>
                  <Select
                    value={revenueMax || "_any"}
                    onValueChange={(v) => setRevenueMax(v === "_any" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 w-[110px] rounded-lg bg-card border-border text-sm">
                      <SelectValue placeholder="Max" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any">No max</SelectItem>
                      {REVENUE_THRESHOLDS.map((t) => (
                        <SelectItem key={`max-${t.value}`} value={String(t.value)}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location & Type */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Geography
                </Label>
                <Select
                  value={geography || "_any"}
                  onValueChange={(v) => setGeography(v === "_any" ? "" : v)}
                >
                  <SelectTrigger className="h-11 rounded-lg bg-muted/50 border-border">
                    <SelectValue placeholder="Any location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">Any location</SelectItem>
                    {GEOGRAPHY_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Company Type
                </Label>
                <Select
                  value={companyType || "_any"}
                  onValueChange={(v) => setCompanyType(v === "_any" ? "" : v)}
                >
                  <SelectTrigger className="h-11 rounded-lg bg-muted/50 border-border">
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">Any type</SelectItem>
                    {COMPANY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-select sections */}
            <div className="space-y-3">
              <ChipSelector
                label="Job Titles"
                icon={Briefcase}
                options={ICP_JOB_TITLES}
                selected={jobTitleSet}
                onToggle={(k) => setJobTitleSet((s) => toggleSet(s, k))}
                description="Select decision-maker titles to target"
              />

              <ChipSelector
                label="Industries"
                icon={Building2}
                options={ICP_INDUSTRIES}
                selected={industrySet}
                onToggle={(k) => setIndustrySet((s) => toggleSet(s, k))}
                description="Filter by company industry"
              />

              <ChipSelector
                label="Technologies"
                icon={Cpu}
                options={TECH_OPTIONS}
                selected={techSet}
                onToggle={(k) => setTechSet((s) => toggleSet(s, k))}
                description="Optional: Filter by tech stack"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                ICP will be saved for {clientName}
              </p>
              <Button
                type="submit"
                disabled={saving || !clientId || !name.trim()}
                className="rounded-lg px-6"
              >
                {saving ? "Saving…" : "Save ICP"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Saved ICPs */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Saved ICPs</CardTitle>
          <CardDescription>
            {initialIcps.length} profile{initialIcps.length !== 1 ? "s" : ""} for {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(initialIcps ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
              <Target className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No ICPs created yet. Create your first ICP above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {initialIcps.map((icp) => (
                <div
                  key={icp.id}
                  className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground">{icp.name}</h4>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        {formatIcpSummary(icp, null)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {new Date(icp.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
