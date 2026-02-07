import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
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
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const payload = {
    user_id: user.id,
    name,
    industry: (body.industry as string | undefined)?.trim() ?? null,
    website: (body.website as string | undefined)?.trim() ?? null,
    notes: (body.notes as string | undefined)?.trim() ?? null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ client: data });
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}
