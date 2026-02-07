import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initJobSteps } from "@/lib/jobs/orchestrator";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const icpId = (body.icpId as string | undefined)?.trim();
  const clientId = (body.clientId as string | undefined)?.trim();
  const requestedLeadCount = Number(body.requestedLeadCount ?? body.batchSize ?? 100);
  const leadsPerBatch = Number(body.leadsPerBatch ?? 100);
  const source = (body.source as string | undefined)?.trim() ?? "apify";
  const instantlyCampaignId = (body.instantlyCampaignId as string | undefined)?.trim();

  if (!icpId) {
    return NextResponse.json({ error: "icpId required" }, { status: 400 });
  }
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }
  if (!instantlyCampaignId) {
    return NextResponse.json({ error: "instantlyCampaignId required" }, { status: 400 });
  }

  const { data: icp } = await supabase
    .from("icp_profiles")
    .select("id, client_id")
    .eq("id", icpId)
    .eq("user_id", user.id)
    .single();
  if (!icp) {
    return NextResponse.json({ error: "ICP not found" }, { status: 404 });
  }
  if (icp.client_id && icp.client_id !== clientId) {
    return NextResponse.json({ error: "ICP does not match client" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("lead_jobs")
    .insert({
      user_id: user.id,
      client_id: clientId,
      icp_id: icpId,
      status: "queued",
      batch_size: Number.isFinite(leadsPerBatch) && leadsPerBatch > 0 ? leadsPerBatch : 100,
      requested_lead_count: Math.max(0, requestedLeadCount),
      instantly_campaign_id: instantlyCampaignId,
      progress_step: "scrape",
      progress_percent: 0,
      source,
    })
    .select()
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message ?? "Job create failed" }, { status: 500 });
  }

  await initJobSteps(supabase, job.id);

  return NextResponse.json({ job });
}
