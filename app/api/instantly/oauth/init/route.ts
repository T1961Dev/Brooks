import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const INSTANTLY_API_BASE = "https://api.instantly.ai/api/v2";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const provider = (body.provider as string) || "google";

  const { data: integration } = await supabase
    .from("user_integrations")
    .select("credentials")
    .eq("user_id", user.id)
    .eq("provider", "instantly")
    .single();

  const creds = (integration?.credentials as { api_key?: string }) ?? {};
  const apiKey = creds.api_key;
  if (!apiKey) {
    return NextResponse.json({ error: "Instantly not connected. Add API key and Workspace ID in Integrations." }, { status: 400 });
  }

  const endpoint = provider === "microsoft" ? `${INSTANTLY_API_BASE}/oauth/microsoft/init` : `${INSTANTLY_API_BASE}/oauth/google/init`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || "Instantly OAuth init failed" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({
    auth_url: data.auth_url,
    session_id: data.session_id,
    expires_at: data.expires_at,
  });
}
