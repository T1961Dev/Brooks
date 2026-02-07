import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const icpId = request.nextUrl.searchParams.get("icpId");
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!icpId) return NextResponse.json({ error: "icpId required" }, { status: 400 });

  let query = supabase
    .from("icp_profiles")
    .select("headcount_min, headcount_max, industries, job_titles, geography, client_id")
    .eq("id", icpId)
    .eq("user_id", user.id);
  if (clientId) query = query.eq("client_id", clientId);
  const { data: icp } = await query.single();

  if (!icp) return NextResponse.json({ error: "ICP not found" }, { status: 404 });

  // Estimate from narrowness of filters; in production this would call Apify or similar
  const industryCount = (icp.industries ?? []).length || 5;
  const titleCount = (icp.job_titles ?? []).length || 10;
  const headcountRange = (icp.headcount_max ?? 1000) - (icp.headcount_min ?? 0);
  const estimate = Math.min(
    50000,
    Math.max(500, Math.round((10000 / industryCount) * (8000 / titleCount) * Math.min(2, 10000 / Math.max(1, headcountRange))))
  );

  return NextResponse.json({ estimate });
}
