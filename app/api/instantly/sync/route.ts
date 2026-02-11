import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  pushLeadsToExistingCampaign,
  createInstantlyCampaign,
  resolveInstantlyApiKey,
} from "@/lib/integrations/instantly";

/**
 * POST /api/instantly/sync
 *
 * Legacy sync endpoint — creates a new campaign and pushes all leads for a client.
 * Now uses V2 API + resolveInstantlyApiKey for credential resolution.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const selectedClientId = (body.clientId as string | undefined)?.trim();
  if (!selectedClientId) {
    return NextResponse.json(
      { error: "clientId required" },
      { status: 400 }
    );
  }

  // Resolve Instantly API key
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const apiKey = await resolveInstantlyApiKey(
    admin,
    user.id,
    selectedClientId
  );
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No Instantly API key found. Add your key in Settings → Integrations, or set INSTANTLY_API_KEY in .env",
      },
      { status: 400 }
    );
  }

  // Load leads
  const { data: leadsRows } = await supabase
    .from("leads")
    .select("email, first_name, last_name, company, domain")
    .eq("user_id", user.id)
    .eq("client_id", selectedClientId)
    .limit(500);

  const leads = (leadsRows ?? []).map((r) => ({
    email: r.email,
    first_name: r.first_name ?? undefined,
    last_name: r.last_name ?? undefined,
    company_name: r.company ?? undefined,
    website: r.domain ? `https://${r.domain}` : undefined,
  }));

  if (leads.length === 0) {
    return NextResponse.json(
      { error: "No leads to sync. Run lead scrape first." },
      { status: 400 }
    );
  }

  try {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", selectedClientId)
      .single();
    const clientName = client?.name ?? "Client";
    const campaignName = `${clientName} - Campaign`;

    // Create a new campaign via V2 API
    const { campaignId } = await createInstantlyCampaign(
      apiKey,
      campaignName
    );

    // Push leads via V2 API
    const { added } = await pushLeadsToExistingCampaign(
      apiKey,
      campaignId,
      leads
    );

    // Record the campaign
    await admin.from("campaigns").insert({
      user_id: user.id,
      client_id: selectedClientId,
      instantly_campaign_id: campaignId,
      name: campaignName,
      status: "active",
    });

    return NextResponse.json({
      campaignId,
      campaignName,
      status: "active",
      leadsAdded: added,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Instantly sync failed",
      },
      { status: 500 }
    );
  }
}
