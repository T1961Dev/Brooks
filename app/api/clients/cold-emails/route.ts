import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("client_cold_emails")
    .select("data")
    .eq("user_id", user.id)
    .eq("client_id", clientId)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data?.data ?? {} });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const clientId = (body.clientId as string | undefined)?.trim();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("client_cold_emails")
    .upsert(
      {
        user_id: user.id,
        client_id: clientId,
        data: body.data ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data?.data ?? {} });
}
