"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Play,
  Download,
  Send,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Mail,
  Users,
  Database,
  Sparkles,
  Bell,
  Upload,
} from "lucide-react";

type IcpOption = { id: string; name: string; client_id: string | null };
type Client = { id: string; name: string };
type JobRow = {
  id: string;
  status: string;
  batch_size: number | null;
  instantly_list_name: string | null;
  instantly_campaign_id: string | null;
  progress_step: string | null;
  progress_percent: number | null;
  created_at: string;
  client_id: string | null;
  requested_lead_count: number | null;
  actual_lead_count: number | null;
  verification_breakdown: Record<string, number> | null;
  finished_at: string | null;
  error: string | null;
};
type Campaign = { id: string; name: string; status: string };

/* -------------------------------------------------------------------------- */
/*  Pipeline step definitions                                                  */
/* -------------------------------------------------------------------------- */

interface PipelineStep {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    key: "scrape",
    label: "Scraping",
    description: "Finding leads from Apify",
    icon: Search,
  },
  {
    key: "verify_mx",
    label: "MX Check",
    description: "Validating email domains",
    icon: Mail,
  },
  {
    key: "dedupe",
    label: "Deduplication",
    description: "Removing duplicate leads",
    icon: Users,
  },
  {
    key: "enrich",
    label: "Enrichment",
    description: "Adding company data",
    icon: Sparkles,
  },
  {
    key: "store",
    label: "Storing",
    description: "Saving leads to database",
    icon: Database,
  },
];

/** Map raw step keys from the backend to the canonical pipeline step */
function normalizeStep(step: string | null): string {
  if (!step) return "scrape";
  // verify, verify_mx, verify_smtp all map to verify_mx in the visual pipeline
  if (step === "verify" || step === "verify_smtp") return "verify_mx";
  // classify maps to enrich in the visual pipeline (both are enrichment phase)
  if (step === "classify") return "enrich";
  // notify maps to store (post-store notification)
  if (step === "notify") return "store";
  // export is after the pipeline
  if (step === "export") return "store";
  return step;
}

/* -------------------------------------------------------------------------- */
/*  Push to Instantly Dialog                                                   */
/* -------------------------------------------------------------------------- */
function PushToInstantlyForm({
  jobId,
  clientId,
  onDone,
}: {
  jobId: string;
  clientId: string;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [campaignId, setCampaignId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [filter, setFilter] = useState("valid_catchall");
  const [exportMode, setExportMode] = useState("net_new");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [noCreds, setNoCreds] = useState(false);

  useEffect(() => {
    setLoadingCampaigns(true);
    setNoCreds(false);
    fetch(`/api/instantly/campaigns?clientId=${encodeURIComponent(clientId)}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          if (r.status === 400 && d.error?.includes("No Instantly")) {
            setNoCreds(true);
          }
          setCampaigns([]);
          return;
        }
        const d = await r.json();
        setCampaigns(d.campaigns ?? []);
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoadingCampaigns(false));
  }, [clientId]);

  const handlePush = async () => {
    setLoading(true);
    try {
      const payload: Record<string, string> = { jobId, mode, filter, exportMode };
      if (mode === "existing") payload.campaignId = campaignId;
      if (mode === "new") payload.campaignName = campaignName;

      const res = await fetch("/api/jobs/push-to-instantly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Push failed");
      toast.success(
        `Pushed ${data.leadsAdded} leads to "${data.campaignName}"`
      );
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to push to Instantly"
      );
    } finally {
      setLoading(false);
    }
  };

  if (noCreds) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm space-y-2">
        <p className="text-muted-foreground">
          No Instantly credentials found. Connect your Instantly account in the{" "}
          <a href="/integrations" className="underline text-foreground">
            Integrations
          </a>{" "}
          page first.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Push mode</Label>
        <Select
          value={mode}
          onValueChange={(v) => setMode(v as "existing" | "new")}
        >
          <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="existing">Add to existing campaign</SelectItem>
            <SelectItem value="new">Create new campaign</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "existing" && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Campaign</Label>
          {loadingCampaigns ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading campaigns…
            </p>
          ) : campaigns.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No campaigns found. Create one in Instantly first, or switch to
              &ldquo;Create new campaign&rdquo;.
            </p>
          ) : (
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-border">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {mode === "new" && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">New campaign name</Label>
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. Acme Corp - Q1 Outreach"
            className="rounded-lg bg-muted/50 border-border"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium">Lead filter</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="valid_catchall">
              Valid + Catch-all (recommended)
            </SelectItem>
            <SelectItem value="valid">Valid only</SelectItem>
            <SelectItem value="all">All leads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Duplicate handling</Label>
        <Select value={exportMode} onValueChange={setExportMode}>
          <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net_new">Only net new leads</SelectItem>
            <SelectItem value="all">Push all selected leads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handlePush}
        disabled={
          loading ||
          (mode === "existing" && !campaignId) ||
          (mode === "new" && !campaignName.trim())
        }
        className="rounded-lg w-full"
        size="sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Pushing…
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Push to Instantly
          </>
        )}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status badge                                                              */
/* -------------------------------------------------------------------------- */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "succeeded":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 gap-1"
        >
          <CheckCircle2 className="h-3 w-3" /> Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className="border-red-500/30 text-red-400 gap-1"
        >
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    case "running":
      return (
        <Badge
          variant="outline"
          className="border-blue-500/30 text-blue-400 gap-1"
        >
          <Loader2 className="h-3 w-3 animate-spin" /> Running
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="border-border text-muted-foreground gap-1"
        >
          <Clock className="h-3 w-3" /> Queued
        </Badge>
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Pipeline progress tracker                                                  */
/* -------------------------------------------------------------------------- */
function PipelineTracker({
  currentStep,
  percent,
}: {
  currentStep: string | null;
  percent: number;
}) {
  const normalized = normalizeStep(currentStep);
  const currentIdx = PIPELINE_STEPS.findIndex((s) => s.key === normalized);

  return (
    <div className="space-y-3">
      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-start gap-1">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isComplete = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              {/* Icon circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500
                  ${
                    isComplete
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isCurrent
                        ? "bg-primary/20 text-primary ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground/50"
                  }
                `}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-1 text-center leading-tight ${
                  isCurrent
                    ? "text-primary font-medium"
                    : isComplete
                      ? "text-emerald-400"
                      : "text-muted-foreground/50"
                }`}
              >
                {step.label}
              </span>

              {/* Active description */}
              {isCurrent && (
                <span className="text-[9px] text-muted-foreground mt-0.5 text-center">
                  {step.description}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */
export function JobsView({
  initialIcps,
  initialJobs,
  initialClients,
  selectedClientId,
}: {
  initialIcps: IcpOption[];
  initialJobs: JobRow[];
  initialClients: Client[];
  selectedClientId: string | null;
}) {
  const router = useRouter();
  const clientId = selectedClientId ?? initialClients[0]?.id ?? "";
  const filteredIcps = initialIcps.filter((icp) =>
    clientId ? icp.client_id === clientId : true
  );

  const [icpId, setIcpId] = useState(filteredIcps[0]?.id ?? "");
  const [batchSize, setBatchSize] = useState("200");
  const [leadsPerBatch, setLeadsPerBatch] = useState("100");
  const [creating, setCreating] = useState(false);
  const [marketSizeEstimate, setMarketSizeEstimate] = useState<number | null>(
    null
  );
  const [marketBreakdown, setMarketBreakdown] = useState<{
    geography: string;
    matchingCompanies: number;
    contactsPerCompany: number;
    totalContacts: number;
    withValidEmail: number;
  } | null>(null);
  const [marketSizeChecked, setMarketSizeChecked] = useState(false);
  const [checkingMarket, setCheckingMarket] = useState(false);

  // Live job tracking
  const [liveJobs, setLiveJobs] = useState<Map<string, JobRow>>(new Map());
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [pushJobId, setPushJobId] = useState<string | null>(null);
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const cappedRequest =
    marketSizeEstimate != null
      ? Math.min(Number(batchSize) || 0, marketSizeEstimate)
      : Number(batchSize) || 0;

  // Merge server-side jobs with live-polled updates
  const allJobs: JobRow[] = initialJobs.map((job) => {
    const live = liveJobs.get(job.id);
    return live ?? job;
  });

  // Add any newly created jobs not yet in initialJobs
  for (const [id, job] of liveJobs) {
    if (!initialJobs.find((j) => j.id === id)) {
      allJobs.unshift(job);
    }
  }

  // Reset ICP when client changes
  useEffect(() => {
    if (filteredIcps.length > 0 && !filteredIcps.find((i) => i.id === icpId)) {
      setIcpId(filteredIcps[0]?.id ?? "");
    }
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      for (const timer of pollingRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  /* ---- Poll a running job for live progress ---- */
  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(
          `/api/jobs/status?jobId=${encodeURIComponent(jobId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const job = data.job as JobRow;

        // Update live state with fresh DB values
        setLiveJobs((prev) => new Map(prev).set(jobId, job));

        // Keep polling if the job is still running
        if (job.status === "running" || job.status === "queued") {
          const timer = setTimeout(() => pollJob(jobId), 2000);
          pollingRef.current.set(jobId, timer);
        } else {
          // Job finished — stop polling, refresh server data
          pollingRef.current.delete(jobId);
          router.refresh();

          if (job.status === "succeeded") {
            const leads = job.actual_lead_count ?? 0;
            toast.success(
              `Job complete! ${leads} leads stored and ready. Push to Instantly when you're ready.`
            );
          } else if (job.status === "failed") {
            toast.error(`Job failed: ${job.error ?? "Unknown error"}`);
          }
        }
      } catch {
        // Retry on network error
        const timer = setTimeout(() => pollJob(jobId), 5000);
        pollingRef.current.set(jobId, timer);
      }
    },
    [router]
  );

  /* ---- Start polling for a job ---- */
  const startPolling = useCallback(
    (jobId: string) => {
      const existing = pollingRef.current.get(jobId);
      if (existing) clearTimeout(existing);
      pollJob(jobId);
    },
    [pollJob]
  );

  /* ---- Trigger the process step + poll for live progress ---- */
  const triggerProcess = useCallback(
    async (jobId: string) => {
      if (processingJobId === jobId) return;
      setProcessingJobId(jobId);

      // Start polling for live progress updates while processing runs.
      // The process route updates progress_step and progress_percent in the DB
      // as it moves through each pipeline step — polling picks those up.
      startPolling(jobId);

      try {
        const res = await fetch("/api/jobs/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        const data = await res.json();

        if (res.ok && data.status === "succeeded") {
          // Final update — process is done
          setLiveJobs((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(jobId);
            if (existing) {
              updated.set(jobId, {
                ...existing,
                status: "succeeded",
                progress_step: "store",
                progress_percent: 100,
                actual_lead_count: data.leads,
                verification_breakdown: data.verificationBreakdown ?? existing.verification_breakdown,
                finished_at: new Date().toISOString(),
              });
            }
            return updated;
          });

          // Stop polling (job finished)
          const timer = pollingRef.current.get(jobId);
          if (timer) clearTimeout(timer);
          pollingRef.current.delete(jobId);

          toast.success(
            `Pipeline complete! ${data.leads} leads stored. Push to Instantly when ready.`
          );
          router.refresh();
        } else if (res.ok && data.status === "running") {
          // Apify still running somehow — just keep polling
          toast.info("Still processing, please wait…");
        } else if (!res.ok) {
          toast.error(data.error ?? "Processing failed");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Processing failed"
        );
      } finally {
        setProcessingJobId(null);
      }
    },
    [processingJobId, router, startPolling]
  );

  /* ---- Start polling for any already-running jobs on mount ---- */
  useEffect(() => {
    for (const job of initialJobs) {
      if (job.status === "running" || job.status === "queued") {
        startPolling(job.id);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Market size check ---- */
  const handleCheckMarketSize = async () => {
    if (!icpId) return;
    setCheckingMarket(true);
    try {
      const params = new URLSearchParams({ icpId });
      if (clientId) params.set("clientId", clientId);
      const res = await fetch(`/api/jobs/market-size?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMarketSizeEstimate(data.estimate);
      setMarketBreakdown(data.breakdown ?? null);
      setMarketSizeChecked(true);
    } finally {
      setCheckingMarket(false);
    }
  };

  /* ---- Create & run a job ---- */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icpId || !clientId) return;
    const requested =
      marketSizeEstimate != null
        ? Math.min(Number(batchSize) || 100, marketSizeEstimate)
        : Number(batchSize) || 100;
    setCreating(true);
    try {
      // 1. Create the job
      const createRes = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icpId,
          clientId,
          requestedLeadCount: requested,
          leadsPerBatch: Number(leadsPerBatch) || 100,
          source: "apify",
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok)
        throw new Error(createData.error || "Create failed");

      const job = createData.job;
      const jobId = job.id as string;

      // Add to live jobs immediately so it shows in the list
      setLiveJobs((prev) =>
        new Map(prev).set(jobId, {
          id: jobId,
          status: "running",
          batch_size: job.batch_size,
          instantly_list_name: null,
          instantly_campaign_id: null,
          progress_step: "scrape",
          progress_percent: 5,
          created_at: job.created_at,
          client_id: job.client_id,
          requested_lead_count: job.requested_lead_count,
          actual_lead_count: null,
          verification_breakdown: null,
          finished_at: null,
          error: null,
        })
      );

      toast.success(
        "Job started — scraping leads from Apify. This takes ~30 seconds…"
      );

      // 2. Start the Apify run — .call() blocks until the actor finishes.
      //    This request takes ~20-60s while Apify scrapes.
      const runRes = await fetch("/api/jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const runData = await runRes.json();
      if (!runRes.ok) {
        throw new Error(runData.error || "Run failed");
      }

      // Scrape is done — update UI
      setLiveJobs((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(jobId);
        if (existing) {
          updated.set(jobId, {
            ...existing,
            status: "running",
            progress_step: "verify_mx",
            progress_percent: 38,
          });
        }
        return updated;
      });

      toast.success(
        `Scraping complete — ${runData.datasetId ? "dataset ready" : "processing"}! Now verifying & enriching leads…`
      );

      // 3. Trigger the processing pipeline.
      //    triggerProcess will also start polling for live progress updates.
      triggerProcess(jobId);

      setMarketSizeChecked(false);
      setMarketSizeEstimate(null);
      setMarketBreakdown(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start job"
      );
    } finally {
      setCreating(false);
    }
  };

  if (initialClients.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Lead Jobs</CardTitle>
          <CardDescription>
            Create a client first, then set up ICPs and run jobs.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Create Job ---- */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>New Lead Job</CardTitle>
          <CardDescription>
            Scrape, verify, deduplicate and enrich leads based on an ICP.
            The pipeline runs automatically — push to Instantly after.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            {/* Client */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Client
              </Label>
              <p className="text-sm text-foreground py-1">
                {initialClients.find((c) => c.id === clientId)?.name ??
                  "Select a client in the header"}
              </p>
            </div>

            {/* ICP */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">
                ICP profile
              </Label>
              {filteredIcps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No ICPs for this client.{" "}
                  <a href="/icp" className="underline">
                    Create one
                  </a>
                  .
                </p>
              ) : (
                <Select value={icpId} onValueChange={setIcpId}>
                  <SelectTrigger className="h-10 rounded-lg bg-muted/50 border-border">
                    <SelectValue placeholder="Select ICP" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredIcps.map((icp) => (
                      <SelectItem key={icp.id} value={icp.id}>
                        {icp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Counts */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Requested lead count
              </Label>
              <Input
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                placeholder="200"
                type="number"
                min={1}
                className="rounded-lg bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Leads per batch
              </Label>
              <Input
                value={leadsPerBatch}
                onChange={(e) => setLeadsPerBatch(e.target.value)}
                placeholder="100"
                type="number"
                min={1}
                className="rounded-lg bg-muted/50 border-border"
              />
            </div>

            {/* Market size check */}
            <div className="md:col-span-2 space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">
                Market size check (required)
              </Label>
              <p className="text-xs text-muted-foreground">
                Estimate addressable market for this ICP before running.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg border-border gap-2"
                disabled={!icpId || checkingMarket}
                onClick={handleCheckMarketSize}
              >
                {checkingMarket ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {checkingMarket ? "Checking…" : "Check market size"}
              </Button>
              {marketSizeEstimate != null && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm space-y-3">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold text-foreground text-base">
                      ~{marketSizeEstimate.toLocaleString()} leads
                    </p>
                    <span className="text-xs text-muted-foreground">estimated</span>
                  </div>

                  {marketBreakdown && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Geography</span>
                      <span className="text-foreground">{marketBreakdown.geography}</span>
                      <span>Matching companies</span>
                      <span className="text-foreground">~{marketBreakdown.matchingCompanies.toLocaleString()}</span>
                      <span>Contacts per company</span>
                      <span className="text-foreground">~{marketBreakdown.contactsPerCompany}</span>
                      <span>Total contacts</span>
                      <span className="text-foreground">~{marketBreakdown.totalContacts.toLocaleString()}</span>
                      <span>With valid email</span>
                      <span className="text-foreground font-medium">~{marketBreakdown.withValidEmail.toLocaleString()}</span>
                    </div>
                  )}

                  <p className="text-muted-foreground text-xs">
                    Requested: {batchSize}.{" "}
                    {Number(batchSize) > marketSizeEstimate
                      ? `Will cap to ${cappedRequest.toLocaleString()}.`
                      : "Within range."}
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={
                  creating ||
                  !icpId ||
                  !clientId ||
                  !marketSizeChecked ||
                  marketSizeEstimate == null ||
                  cappedRequest < 1
                }
                className="rounded-lg gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running pipeline…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Job
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---- Job list ---- */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>
            Jobs run automatically. Completed jobs can be exported or pushed
            to Instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <div className="space-y-4">
              {allJobs.map((job) => {
                const clientName =
                  initialClients.find((c) => c.id === job.client_id)?.name ??
                  "—";
                const isPushing = pushJobId === job.id;
                const isProcessing = processingJobId === job.id;
                const isRunning =
                  job.status === "running" || job.status === "queued";

                return (
                  <div
                    key={job.id}
                    className="rounded-xl border border-border p-4 space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {clientName}
                          </span>
                          <StatusBadge status={job.status} />
                          {isRunning && job.requested_lead_count != null && (
                            <span className="text-xs text-muted-foreground">
                              {job.requested_lead_count} leads requested
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap shrink-0">
                        {job.status === "succeeded" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg border-border gap-1.5"
                              asChild
                            >
                              <a
                                href={`/api/jobs/export-csv?jobId=${encodeURIComponent(job.id)}`}
                                download
                              >
                                <Download className="h-3.5 w-3.5" />
                                CSV
                              </a>
                            </Button>
                            <Button
                              variant={isPushing ? "secondary" : "outline"}
                              size="sm"
                              className="rounded-lg border-border gap-1.5"
                              onClick={() =>
                                setPushJobId(isPushing ? null : job.id)
                              }
                            >
                              <Send className="h-3.5 w-3.5" />
                              {isPushing ? "Cancel" : "Push to Instantly"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Live pipeline tracker for running jobs */}
                    {isRunning && (
                      <PipelineTracker
                        currentStep={job.progress_step}
                        percent={job.progress_percent ?? 0}
                      />
                    )}

                    {/* Completed job stats */}
                    {!isRunning && (
                      <div className="space-y-2">
                        {/* Lead counts */}
                        <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
                          {job.requested_lead_count != null && (
                            <span>
                              Requested: {job.requested_lead_count}
                            </span>
                          )}
                          {job.actual_lead_count != null && (
                            <span className="text-foreground font-medium">
                              Stored: {job.actual_lead_count}
                            </span>
                          )}
                        </div>

                        {/* Verification breakdown */}
                        {job.verification_breakdown &&
                          Object.keys(job.verification_breakdown).length >
                            0 && (
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(
                                job.verification_breakdown
                              ).map(([k, v]) => (
                                <Badge
                                  key={k}
                                  variant="outline"
                                  className={`text-xs capitalize ${
                                    k === "valid"
                                      ? "border-emerald-500/30 text-emerald-400"
                                      : k === "catch_all"
                                        ? "border-amber-500/30 text-amber-400"
                                        : k === "invalid"
                                          ? "border-red-500/30 text-red-400"
                                          : "border-border text-muted-foreground"
                                  }`}
                                >
                                  {k.replace("_", " ")}: {v}
                                </Badge>
                              ))}
                            </div>
                          )}

                        {job.finished_at && (
                          <div className="text-xs text-muted-foreground">
                            Finished{" "}
                            {new Date(job.finished_at).toLocaleString()}
                          </div>
                        )}
                        {job.error && (
                          <div className="text-xs text-red-400 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            {job.error}
                          </div>
                        )}
                        {job.instantly_campaign_id && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            Pushed to Instantly
                          </div>
                        )}
                      </div>
                    )}

                    {/* Push to Instantly form (inline) */}
                    {isPushing && job.status === "succeeded" && (
                      <PushToInstantlyForm
                        jobId={job.id}
                        clientId={job.client_id ?? clientId}
                        onDone={() => {
                          setPushJobId(null);
                          router.refresh();
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
