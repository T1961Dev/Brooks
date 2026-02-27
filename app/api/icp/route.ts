import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("icp_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ icps: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const id = (body.id as string | undefined)?.trim();
  const name = (body.name as string | undefined)?.trim();
  const clientId = (body.client_id as string | undefined)?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const payload = {
    user_id: user.id,
    name,
    headcount_brackets: body.headcount_brackets ?? [],
    headcount_min: body.headcount_min ?? null,
    headcount_max: body.headcount_max ?? null,
    revenue_min: body.revenue_min ?? null,
    revenue_max: body.revenue_max ?? null,
    job_titles: body.job_titles ?? [],
    industries: body.industries ?? [],
    industry_keywords: body.industry_keywords ?? [],
    geography: body.geography ?? null,
    company_type: body.company_type ?? null,
    technologies: body.technologies ?? [],
    client_id: clientId,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from("icp_profiles")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ icp: data });
  }

  const { data, error } = await supabase
    .from("icp_profiles")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ icp: data });
}
