import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApifyRunStatus, getApifyDatasetItems } from "@/lib/integrations/apify";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Legacy endpoint — kept for backward compat.
 * The primary flow now goes through /api/jobs/process.
 */
export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getApifyRunStatus(runId);

  if (status.status === "SUCCEEDED" && status.datasetId) {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const items = await getApifyDatasetItems(status.datasetId);

    for (const item of items) {
      const email = item.email?.toString()?.trim();
      if (!email) continue;
      await admin.from("leads").upsert(
        {
          user_id: user.id,
          email,
          first_name: item.first_name ?? null,
          last_name: item.last_name ?? null,
          title: item.job_title ?? null,
          company: item.company_name ?? null,
          domain: item.company_domain ?? null,
          linkedin_url: item.linkedin ?? null,
          industry: item.industry ?? null,
          location:
            [item.city, item.state, item.country].filter(Boolean).join(", ") ||
            null,
          source: { apify_run_id: runId },
        },
        { onConflict: "user_id,email" }
      );
    }

    await admin
      .from("apify_runs")
      .update({ status: "SUCCEEDED", apify_dataset_id: status.datasetId })
      .eq("user_id", user.id)
      .eq("apify_run_id", runId);
  }

  return NextResponse.json({
    runId,
    status: status.status,
    datasetId: status.datasetId,
  });
}
