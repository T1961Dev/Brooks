import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { hashToken } from "@/lib/security/tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const token = (body.token as string | undefined)?.trim();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tokenHash = hashToken(token);
  const { data: tokenRow } = await admin
    .from("client_onboarding_tokens")
    .select("id, user_id, client_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .single();

  if (!tokenRow) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  if (tokenRow.used_at) return NextResponse.json({ error: "Token already used" }, { status: 400 });
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  const icp = body.icp ?? {};
  const offer = body.offer ?? {};
  const coldEmails = body.coldEmails ?? {};

  const icpInsert = {
    user_id: tokenRow.user_id,
    client_id: tokenRow.client_id,
    name: icp.name ?? "Client ICP",
    headcount_min: icp.headcount_min ?? null,
    headcount_max: icp.headcount_max ?? null,
    revenue_min: icp.revenue_min ?? null,
    revenue_max: icp.revenue_max ?? null,
    job_titles: icp.job_titles ?? [],
    industries: icp.industries ?? [],
    geography: icp.geography ?? null,
    company_type: icp.company_type ?? null,
    technologies: icp.technologies ?? [],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const { error: icpError } = await admin.from("icp_profiles").insert(icpInsert);
  if (icpError) return NextResponse.json({ error: icpError.message }, { status: 500 });

  const { error: offerError } = await admin
    .from("client_offers")
    .upsert(
      {
        user_id: tokenRow.user_id,
        client_id: tokenRow.client_id,
        data: offer,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_id" }
    );
  if (offerError) return NextResponse.json({ error: offerError.message }, { status: 500 });

  const { error: coldError } = await admin
    .from("client_cold_emails")
    .upsert(
      {
        user_id: tokenRow.user_id,
        client_id: tokenRow.client_id,
        data: coldEmails,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_id" }
    );
  if (coldError) return NextResponse.json({ error: coldError.message }, { status: 500 });

  await admin
    .from("clients")
    .update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() })
    .eq("id", tokenRow.client_id)
    .eq("user_id", tokenRow.user_id);

  await admin
    .from("client_onboarding_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return NextResponse.json({ ok: true });
}
