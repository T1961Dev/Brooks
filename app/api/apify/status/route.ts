import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApifyRunStatus, getApifyDatasetItems } from "@/lib/integrations/apify";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: runRow } = await supabase
    .from("apify_runs")
    .select("apify_run_id")
    .eq("user_id", user.id)
    .eq("apify_run_id", runId)
    .single();

  const apifyRunId = runRow?.apify_run_id ?? runId;
  const status = await getApifyRunStatus(apifyRunId);

  if (status.status === "SUCCEEDED" && status.datasetId) {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const items = await getApifyDatasetItems(status.datasetId);
    for (const item of items) {
      const email = (item.email ?? item.Email ?? item.emailAddress)?.toString?.();
      if (!email) continue;
      await admin.from("leads").upsert(
        {
          user_id: user.id,
          email,
          first_name: (item.firstName ?? item.first_name)?.toString?.() ?? null,
          last_name: (item.lastName ?? item.last_name)?.toString?.() ?? null,
          title: (item.title ?? item.jobTitle)?.toString?.() ?? null,
          company: (item.company ?? item.companyName)?.toString?.() ?? null,
          domain: (item.domain ?? item.website)?.toString?.() ?? null,
          linkedin_url: (item.linkedInUrl ?? item.linkedin_url)?.toString?.() ?? null,
          location: (item.location ?? item.city)?.toString?.() ?? null,
          source: { apify_run_id: apifyRunId },
        },
        { onConflict: "user_id,email" }
      );
    }
    await admin.from("apify_runs").update({ status: "SUCCEEDED", apify_dataset_id: status.datasetId }).eq("user_id", user.id).eq("apify_run_id", apifyRunId);
  }

  return NextResponse.json({
    runId: apifyRunId,
    status: status.status,
    datasetId: status.datasetId,
  });
}
