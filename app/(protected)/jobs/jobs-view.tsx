"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type IcpOption = { id: string; name: string; client_id: string | null };
type Client = { id: string; name: string };
type JobRow = {
  id: string;
  status: string;
  batch_size: number | null;
  instantly_list_name: string | null;
  progress_step: string | null;
  progress_percent: number | null;
  created_at: string;
  client_id: string | null;
  requested_lead_count: number | null;
  actual_lead_count: number | null;
  verification_breakdown: Record<string, number> | null;
  finished_at: string | null;
};
type Campaign = { id: string; name: string; status: string };

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
  const filteredIcps = initialIcps.filter((icp) => (clientId ? icp.client_id === clientId : true));
  const [icpId, setIcpId] = useState(filteredIcps[0]?.id ?? "");
  const [batchSize, setBatchSize] = useState("200");
  const [leadsPerBatch, setLeadsPerBatch] = useState("100");
  const [instantlyCampaignId, setInstantlyCampaignId] = useState("");
  const [creating, setCreating] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [marketSizeEstimate, setMarketSizeEstimate] = useState<number | null>(null);
  const [marketSizeChecked, setMarketSizeChecked] = useState(false);
  const [checkingMarket, setCheckingMarket] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const cappedRequest = marketSizeEstimate != null ? Math.min(Number(batchSize) || 0, marketSizeEstimate) : Number(batchSize) || 0;

  useEffect(() => {
    if (!clientId) return;
    setLoadingCampaigns(true);
    fetch(`/api/instantly/campaigns?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((d) => { setCampaigns(d.campaigns ?? []); })
      .catch(() => setCampaigns([]))
      .finally(() => setLoadingCampaigns(false));
  }, [clientId]);

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
      setMarketSizeChecked(true);
    } finally {
      setCheckingMarket(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icpId || !clientId || !instantlyCampaignId) return;
    const requested = marketSizeEstimate != null ? Math.min(Number(batchSize) || 100, marketSizeEstimate) : Number(batchSize) || 100;
    setCreating(true);
    try {
      const createRes = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icpId,
          clientId,
          requestedLeadCount: requested,
          leadsPerBatch: Number(leadsPerBatch) || 100,
          source: "apify",
          instantlyCampaignId,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Create failed");

      const jobId = createData.job?.id as string;
      setRunningJobId(jobId);
      const runRes = await fetch("/api/jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!runRes.ok) {
        const runData = await runRes.json();
        throw new Error(runData.error || "Run failed");
      }
      setMarketSizeChecked(false);
      setMarketSizeEstimate(null);
      router.refresh();
    } finally {
      setCreating(false);
      setRunningJobId(null);
    }
  };

  const handleProcess = async (jobId: string) => {
    setRunningJobId(jobId);
    try {
      const res = await fetch("/api/jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok && data.status === "succeeded") {
        toast.success("Job completed. Leads stored and pushed to Instantly.");
      } else if (!res.ok) {
        toast.error(data.error ?? "Job failed");
      }
      router.refresh();
    } finally {
      setRunningJobId(null);
    }
  };

  if (initialClients.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Create job</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Create a client first, then set up ICPs and jobs for that client.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Create job</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Client</Label>
              <p className="text-sm text-muted-foreground py-1">
                {initialClients.find((c) => c.id === clientId)?.name ?? "Select a client in the header"}
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">ICP profile</Label>
              <select
                value={icpId}
                onChange={(e) => setIcpId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
              >
                {filteredIcps.map((icp) => (
                  <option key={icp.id} value={icp.id}>
                    {icp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Requested lead count</Label>
              <Input
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                placeholder="200"
                type="number"
                min={1}
                className="rounded-xl bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Leads per batch</Label>
              <Input
                value={leadsPerBatch}
                onChange={(e) => setLeadsPerBatch(e.target.value)}
                placeholder="100"
                type="number"
                min={1}
                className="rounded-xl bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Instantly campaign (existing)</Label>
              <select
                value={instantlyCampaignId}
                onChange={(e) => setInstantlyCampaignId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
                required
              >
                <option value="">Select campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {loadingCampaigns && <p className="text-xs text-muted-foreground">Loading campaigns…</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-muted-foreground">Market size check (required)</Label>
              <p className="text-sm text-muted-foreground">
                Estimate addressable market for this ICP. If requested leads exceed availability, the job will be capped. You must run this before Run job.
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-border"
                disabled={!icpId || checkingMarket}
                onClick={handleCheckMarketSize}
              >
                {checkingMarket ? "Checking…" : "Check market size"}
              </Button>
              {marketSizeEstimate != null && (
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <p className="font-medium text-foreground">Addressable market: ~{marketSizeEstimate.toLocaleString()} leads</p>
                  <p className="text-muted-foreground mt-1">
                    Requested: {batchSize}. {Number(batchSize) > marketSizeEstimate ? `Will cap to ${Math.min(Number(batchSize) || 0, marketSizeEstimate).toLocaleString()}.` : "Within range."}
                  </p>
                  <p className="text-muted-foreground">You can proceed with Run job or cancel.</p>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={
                  creating ||
                  !icpId ||
                  !clientId ||
                  !instantlyCampaignId ||
                  !marketSizeChecked ||
                  marketSizeEstimate == null ||
                  cappedRequest < 1
                }
                className="rounded-xl"
              >
                {creating ? "Starting…" : "Run job"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {initialJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <div className="space-y-3">
              {initialJobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium text-foreground">
                        Job • {(initialClients.find((c) => c.id === job.client_id)?.name ?? "—")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {job.status} • {job.progress_step ?? "queued"} • {job.progress_percent ?? 0}%
                        {job.requested_lead_count != null && ` • Requested: ${job.requested_lead_count}`}
                        {job.actual_lead_count != null && ` • Actual: ${job.actual_lead_count}`}
                      </div>
                      {job.verification_breakdown && Object.keys(job.verification_breakdown).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Verification: {Object.entries(job.verification_breakdown).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </div>
                      )}
                      {job.finished_at && (
                        <div className="text-xs text-muted-foreground">Finished {new Date(job.finished_at).toLocaleString()}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {job.status === "succeeded" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-border"
                          asChild
                        >
                          <a href={`/api/jobs/export-csv?jobId=${encodeURIComponent(job.id)}`} download>
                            Export CSV
                          </a>
                        </Button>
                      )}
                      {(job.status === "queued" || job.status === "running") && (
                        <Button
                          variant="outline"
                          className="rounded-xl border-border"
                          disabled={runningJobId === job.id}
                          onClick={() => handleProcess(job.id)}
                        >
                          {runningJobId === job.id ? "Processing…" : "Process"}
                        </Button>
                      )}
                    </div>
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
