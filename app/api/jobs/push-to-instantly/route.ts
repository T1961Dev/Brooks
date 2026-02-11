import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  pushLeadsToExistingCampaign,
  createInstantlyCampaign,
  getCampaign,
  resolveInstantlyApiKey,
} from "@/lib/integrations/instantly";

/**
 * POST /api/jobs/push-to-instantly
 *
 * Push leads from a completed job to an Instantly campaign (V2 API).
 * Supports both "existing" and "new" campaign modes.
 *
 * Body:
 *   jobId:         string (required)
 *   mode:          "existing" | "new" (required)
 *   campaignId:    string (required if mode === "existing")
 *   campaignName:  string (required if mode === "new")
 *   filter:        "all" | "valid" | "valid_catchall" (optional, default "valid_catchall")
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const jobId = (body.jobId as string | undefined)?.trim();
  const mode = (body.mode as string | undefined)?.trim();
  const campaignId = (body.campaignId as string | undefined)?.trim();
  const campaignName = (body.campaignName as string | undefined)?.trim();
  const filter =
    (body.filter as string | undefined)?.trim() ?? "valid_catchall";

  if (!jobId)
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  if (!mode || !["existing", "new"].includes(mode))
    return NextResponse.json(
      { error: "mode must be 'existing' or 'new'" },
      { status: 400 }
    );
  if (mode === "existing" && !campaignId)
    return NextResponse.json(
      { error: "campaignId required for existing mode" },
      { status: 400 }
    );
  if (mode === "new" && !campaignName)
    return NextResponse.json(
      { error: "campaignName required for new mode" },
      { status: 400 }
    );

  /* ---- Load job ---- */
  const { data: job } = await supabase
    .from("lead_jobs")
    .select("id, status, client_id, user_id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "succeeded")
    return NextResponse.json(
      { error: "Job must be completed before pushing to Instantly" },
      { status: 400 }
    );

  /* ---- Resolve Instantly API key ---- */
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const apiKey = await resolveInstantlyApiKey(
    admin,
    user.id,
    job.client_id
  );
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No Instantly API key found. Add your key in Settings → Integrations, or set INSTANTLY_API_KEY in .env",
      },
      { status: 400 }
    );
  }

  /* ---- Load leads for this job ---- */
  let leadQuery = admin
    .from("leads")
    .select(
      "email, first_name, last_name, company, domain, verification_status"
    )
    .eq("job_id", jobId)
    .eq("user_id", user.id);

  if (filter === "valid") {
    leadQuery = leadQuery.eq("verification_status", "valid");
  } else if (filter === "valid_catchall") {
    leadQuery = leadQuery.in("verification_status", [
      "valid",
      "catch_all",
    ]);
  }

  const { data: leads } = await leadQuery;
  if (!leads || leads.length === 0) {
    return NextResponse.json(
      { error: "No leads match the selected filter for this job" },
      { status: 400 }
    );
  }

  /* ---- Resolve campaign ---- */
  let targetCampaignId: string;
  let targetCampaignName: string;

  if (mode === "new") {
    const result = await createInstantlyCampaign(apiKey, campaignName!);
    targetCampaignId = result.campaignId;
    targetCampaignName = campaignName!;
  } else {
    targetCampaignId = campaignId!;
    const campaign = await getCampaign(apiKey, campaignId!);
    targetCampaignName = campaign?.name ?? campaignId!;
  }

  /* ---- Push leads via V2 API ---- */
  const { added, skipped } = await pushLeadsToExistingCampaign(
    apiKey,
    targetCampaignId,
    leads.map((l) => ({
      email: l.email,
      first_name: l.first_name ?? undefined,
      last_name: l.last_name ?? undefined,
      company_name: l.company ?? undefined,
      website: l.domain ? `https://${l.domain}` : undefined,
    }))
  );

  /* ---- Mark leads as exported ---- */
  const filterStatuses =
    filter === "all"
      ? ["valid", "catch_all", "invalid", "risky"]
      : filter === "valid"
        ? ["valid"]
        : ["valid", "catch_all"];

  await admin
    .from("leads")
    .update({ export_status: "exported" })
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .in("verification_status", filterStatuses);

  /* ---- Record export ---- */
  await admin.from("lead_exports").insert({
    job_id: jobId,
    client_id: job.client_id ?? null,
    leads_sent: added,
    success: true,
    error: null,
    instantly_campaign_id: targetCampaignId,
  });

  /* ---- Update job with campaign info ---- */
  await admin
    .from("lead_jobs")
    .update({ instantly_campaign_id: targetCampaignId })
    .eq("id", jobId);

  return NextResponse.json({
    ok: true,
    campaignId: targetCampaignId,
    campaignName: targetCampaignName,
    leadsAdded: added,
    leadsSkipped: skipped,
    mode,
  });
}
