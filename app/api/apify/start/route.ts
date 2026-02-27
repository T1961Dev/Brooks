import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runActorAndFetchItems } from "@/lib/integrations/apify";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Legacy endpoint — kept for backward compat.
 * The primary flow now goes through /api/jobs/run.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const result = await runActorAndFetchItems({
      fetch_count: 100,
      email_status: ["validated"],
      file_name: "Prospects",
    });

    await admin.from("apify_runs").insert({
      user_id: user.id,
      apify_run_id: result.runId,
      status: result.status,
      apify_dataset_id: result.datasetId ?? null,
      input: {},
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      datasetId: result.datasetId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Apify start failed" },
      { status: 500 }
    );
  }
}
