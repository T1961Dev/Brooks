import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testConnection } from "@/lib/integrations/instantly";

/**
 * GET /api/integrations/instantly?clientId=...
 *
 * Returns the Instantly connection status for this user.
 * Checks: per-client creds → agency default creds → env var.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId =
    request.nextUrl.searchParams.get("clientId") ?? undefined;

  // Check for per-user stored key
  let storedKey: string | null = null;
  if (clientId) {
    const { data: clientRow } = await supabase
      .from("user_integrations")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "instantly")
      .eq("client_id", clientId)
      .single();
    const creds = clientRow?.credentials as
      | { api_key?: string }
      | undefined;
    if (creds?.api_key) storedKey = creds.api_key;
  }
  if (!storedKey) {
    const { data: agencyRow } = await supabase
      .from("user_integrations")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "instantly")
      .is("client_id", null)
      .single();
    const creds = agencyRow?.credentials as
      | { api_key?: string }
      | undefined;
    if (creds?.api_key) storedKey = creds.api_key;
  }

  // Check env var fallback
  const envKey = process.env.INSTANTLY_API_KEY || null;
  const effectiveKey = storedKey ?? envKey;

  return NextResponse.json({
    connected: !!effectiveKey,
    source: storedKey
      ? "user_integrations"
      : envKey
        ? "env"
        : null,
    hasStoredKey: !!storedKey,
    hasEnvKey: !!envKey,
  });
}

/**
 * POST /api/integrations/instantly
 *
 * Save (or update) an Instantly API key for this user.
 * Body: { api_key: string, clientId?: string }
 *
 * Also validates the key by calling Instantly before saving.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const api_key = (body.api_key as string)?.trim();
  const clientId = (body.clientId as string)?.trim() || null;

  if (!api_key) {
    return NextResponse.json(
      { error: "api_key is required" },
      { status: 400 }
    );
  }

  // Validate the key with Instantly
  const valid = await testConnection(api_key);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid Instantly API key. Could not authenticate with Instantly V2 API." },
      { status: 400 }
    );
  }

  // Upsert
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
    credentials: { api_key },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("user_integrations")
      .update(row)
      .eq("id", existing.id);
    if (error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
  } else {
    const { error } = await supabase
      .from("user_integrations")
      .insert(row);
    if (error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
  }

  return NextResponse.json({ ok: true, connected: true });
}
