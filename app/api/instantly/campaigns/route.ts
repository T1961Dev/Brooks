import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listCampaigns,
  resolveInstantlyApiKey,
} from "@/lib/integrations/instantly";

/**
 * GET /api/instantly/campaigns?clientId=...
 *
 * Lists campaigns from the Instantly account linked to this user/client.
 * Resolves API key: per-client → agency default → INSTANTLY_API_KEY env var.
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

  const apiKey = await resolveInstantlyApiKey(supabase, user.id, clientId);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No Instantly API key found. Add your key in Settings → Integrations, or set INSTANTLY_API_KEY in .env",
      },
      { status: 400 }
    );
  }

  try {
    const campaigns = await listCampaigns(apiKey);
    return NextResponse.json({ campaigns });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch Instantly campaigns",
      },
      { status: 500 }
    );
  }
}
