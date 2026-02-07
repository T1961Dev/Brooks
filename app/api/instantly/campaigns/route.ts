import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCampaigns } from "@/lib/integrations/instantly";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const { data: clientRow } = await supabase
    .from("user_integrations")
    .select("credentials")
    .eq("user_id", user.id)
    .eq("provider", "instantly")
    .eq("client_id", clientId)
    .single();

  let creds = clientRow?.credentials as { api_key?: string; workspace_id?: string } | undefined;
  if (!creds?.api_key) {
    const { data: agencyRow } = await supabase
      .from("user_integrations")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "instantly")
      .is("client_id", null)
      .single();
    creds = agencyRow?.credentials as typeof creds;
  }
  if (!creds?.api_key || !creds?.workspace_id) {
    return NextResponse.json({ error: "No Instantly credentials. Add in Integrations for this client or agency." }, { status: 400 });
  }
  const campaigns = await listCampaigns(creds.api_key, creds.workspace_id);
  return NextResponse.json({ campaigns });
}
