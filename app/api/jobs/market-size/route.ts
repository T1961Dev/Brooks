import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headcountToSizeFilter } from "@/lib/integrations/apify";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const icpId = request.nextUrl.searchParams.get("icpId");
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!icpId)
    return NextResponse.json({ error: "icpId required" }, { status: 400 });

  let query = supabase
    .from("icp_profiles")
    .select(
      "headcount_min, headcount_max, industries, job_titles, geography, company_type, technologies, client_id"
    )
    .eq("id", icpId)
    .eq("user_id", user.id);
  if (clientId) query = query.eq("client_id", clientId);
  const { data: icp } = await query.single();

  if (!icp)
    return NextResponse.json({ error: "ICP not found" }, { status: 404 });

  /*
   * Heuristic estimate based on filter narrowness.
   * In a future version this could call the Apify actor with fetch_count=0
   * or a dedicated count endpoint.
   */
  const industryCount = (icp.industries ?? []).length || 5;
  const titleCount = (icp.job_titles ?? []).length || 10;
  const sizeFilter = headcountToSizeFilter(
    icp.headcount_min ?? null,
    icp.headcount_max ?? null
  );
  const sizeFactor = sizeFilter.length > 0 ? sizeFilter.length : 8;
  const hasGeo = !!icp.geography;

  // Broader filters → higher estimate
  let estimate = Math.round(
    (industryCount * 800 + titleCount * 400) * (sizeFactor / 4) * (hasGeo ? 0.6 : 1)
  );
  estimate = Math.min(50000, Math.max(200, estimate));

  return NextResponse.json({ estimate });
}
