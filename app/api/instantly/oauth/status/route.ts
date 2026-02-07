import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const INSTANTLY_API_BASE = "https://api.instantly.ai/api/v2";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: integration } = await supabase
    .from("user_integrations")
    .select("credentials")
    .eq("user_id", user.id)
    .eq("provider", "instantly")
    .single();

  const creds = (integration?.credentials as { api_key?: string }) ?? {};
  const apiKey = creds.api_key;
  if (!apiKey) return NextResponse.json({ error: "Instantly not connected" }, { status: 400 });

  const res = await fetch(`${INSTANTLY_API_BASE}/oauth/session/status/${sessionId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data);
}
