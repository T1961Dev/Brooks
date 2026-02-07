import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;

  const { data } = await supabase
    .from("user_integrations")
    .select("credentials")
    .eq("user_id", user.id)
    .eq("provider", "instantly")
    .is("client_id", clientId ?? null)
    .single();

  const creds = (data?.credentials as { api_key?: string; workspace_id?: string }) ?? {};
  return NextResponse.json({
    connected: !!(creds.api_key && creds.workspace_id),
    hasCredentials: !!(creds.api_key && creds.workspace_id),
    workspaceId: creds.workspace_id ? "••••" : null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const api_key = (body.api_key as string)?.trim();
  const workspace_id = (body.workspace_id as string)?.trim();
  const clientId = (body.clientId as string)?.trim() || null;
  if (!api_key || !workspace_id) {
    return NextResponse.json({ error: "api_key and workspace_id required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("user_integrations")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "instantly")
    .is("client_id", clientId)
    .single();

  const row = {
    user_id: user.id,
    provider: "instantly",
    client_id: clientId,
    credentials: { api_key, workspace_id },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("user_integrations")
      .update(row)
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("user_integrations").insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
