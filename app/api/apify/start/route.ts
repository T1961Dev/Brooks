import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStepDataService } from "@/lib/onboarding/data";
import { startApifyRun } from "@/lib/integrations/apify";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coldEmails = await getStepDataService<{
    targetTitles?: string;
    targetIndustries?: string;
  }>(user.id, "cold-emails");
  const icpIntro = await getStepDataService<{ niche?: string }>(user.id, "icp-introduction");
  const business = await getStepDataService<{ targetGeography?: string }>(user.id, "business-assessment");

  const targetTitles = coldEmails?.targetTitles?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  const nicheKeywords = (coldEmails?.targetIndustries ?? icpIntro?.niche ?? "B2B").split(",").map((s) => s.trim()).filter(Boolean);

  const { createClient: createServiceClient } = await import("@supabase/supabase-js");
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const result = await startApifyRun({
      nicheKeywords,
      targetTitles,
      geography: business?.targetGeography ?? "US",
      companySizeMin: 10,
      companySizeMax: 500,
    });

    await admin.from("apify_runs").insert({
      user_id: user.id,
      apify_run_id: result.runId,
      status: result.status,
      input: { nicheKeywords, targetTitles, geography: business?.targetGeography },
    });

    return NextResponse.json({ runId: result.runId, status: result.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Apify start failed" },
      { status: 500 }
    );
  }
}
