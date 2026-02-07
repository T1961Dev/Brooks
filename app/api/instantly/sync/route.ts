import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncToInstantly } from "@/lib/integrations/instantly";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const selectedClientId = (body.clientId as string | undefined)?.trim();
  if (!selectedClientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const { data: coldRow } = await supabase
    .from("client_cold_emails")
    .select("data")
    .eq("user_id", user.id)
    .eq("client_id", selectedClientId)
    .single();
  const coldEmails = (coldRow?.data as { sequence?: { emails: Array<{ subject: string; body: string }> } }) ?? {};
  const sequence = coldEmails?.sequence;
  if (!sequence?.emails?.length) {
    return NextResponse.json({ error: "No cold email sequence found. Complete Cold Emails step first." }, { status: 400 });
  }

  const { data: leadsRows } = await supabase
    .from("leads")
    .select("email, first_name, last_name, company")
    .eq("user_id", user.id)
    .eq("client_id", selectedClientId)
    .limit(500);
  const leads = (leadsRows ?? []).map((r) => ({
    email: r.email,
    first_name: r.first_name ?? undefined,
    last_name: r.last_name ?? undefined,
    company_name: r.company ?? undefined,
  }));

  if (leads.length === 0) {
    return NextResponse.json({ error: "No leads to sync. Run lead scrape first." }, { status: 400 });
  }

  const instantlySequence = {
    emails: sequence.emails.map((e) => ({ subject: e.subject, body: e.body })),
  };

  try {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", selectedClientId)
      .single();
    const clientName = client?.name ?? "Client";
    const result = await syncToInstantly(
      `${clientName} - Campaign`,
      instantlySequence,
      leads
    );

    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await admin.from("campaigns").insert({
      user_id: user.id,
      client_id: selectedClientId,
      instantly_campaign_id: result.campaignId,
      name: result.campaignName,
      status: result.status,
      sequence: sequence,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Instantly sync failed" },
      { status: 500 }
    );
  }
}
