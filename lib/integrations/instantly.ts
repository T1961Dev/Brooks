/**
 * Instantly.ai API V2 integration
 *
 * Official docs: https://developer.instantly.ai/api/v2
 * Auth: Bearer token via `Authorization: Bearer <api_key>`
 * Base URL: https://api.instantly.ai
 *
 * Credential resolution order:
 *   1. Per-client row in `user_integrations` (provider=instantly, client_id=X)
 *   2. Agency-default row in `user_integrations` (provider=instantly, client_id IS NULL)
 *   3. Env var `INSTANTLY_API_KEY`
 */

const DEV_MOCK =
  process.env.NODE_ENV === "development" && process.env.DEV_MOCK !== "false";

const INSTANTLY_BASE = "https://api.instantly.ai/api/v2";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface InstantlyLead {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  website?: string;
  phone?: string;
}

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: number; // 0=Draft, 1=Active, 2=Paused, 3=Completed
}

export interface InstantlyCredentials {
  api_key: string;
}

/* -------------------------------------------------------------------------- */
/*  Core HTTP helper — all V2 calls go through here                           */
/* -------------------------------------------------------------------------- */

async function instantlyV2(
  apiKey: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  query?: Record<string, string>
): Promise<Response> {
  const url = new URL(`${INSTANTLY_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Instantly API V2 error [${res.status}] ${method} ${path}: ${text}`
    );
  }
  return res;
}

/* -------------------------------------------------------------------------- */
/*  Credential resolution                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Resolve the Instantly API key for a user + optional client.
 * Checks user_integrations first (client-specific, then agency default),
 * then falls back to `INSTANTLY_API_KEY` env var.
 */
export async function resolveInstantlyApiKey(
  supabase: { from: (table: string) => any },
  userId: string,
  clientId?: string | null
): Promise<string | null> {
  // 1. Client-specific creds
  if (clientId) {
    const { data: clientRow } = await supabase
      .from("user_integrations")
      .select("credentials")
      .eq("user_id", userId)
      .eq("provider", "instantly")
      .eq("client_id", clientId)
      .single();
    const creds = clientRow?.credentials as { api_key?: string } | undefined;
    if (creds?.api_key) return creds.api_key;
  }

  // 2. Agency default creds
  const { data: agencyRow } = await supabase
    .from("user_integrations")
    .select("credentials")
    .eq("user_id", userId)
    .eq("provider", "instantly")
    .is("client_id", null)
    .single();
  const agencyCreds = agencyRow?.credentials as
    | { api_key?: string }
    | undefined;
  if (agencyCreds?.api_key) return agencyCreds.api_key;

  // 3. Env var fallback
  return process.env.INSTANTLY_API_KEY ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Campaign operations                                                       */
/* -------------------------------------------------------------------------- */

const STATUS_LABELS: Record<number, string> = {
  0: "Draft",
  1: "Active",
  2: "Paused",
  3: "Completed",
  4: "Running Subsequences",
  [-99]: "Account Suspended",
  [-1]: "Accounts Unhealthy",
  [-2]: "Bounce Protect",
};

/**
 * List all campaigns.
 * GET /api/v2/campaigns
 */
export async function listCampaigns(
  apiKey: string
): Promise<InstantlyCampaign[]> {
  if (DEV_MOCK) {
    return [
      { id: "mock-1", name: "Campaign 1", status: 1 },
      { id: "mock-2", name: "Campaign 2", status: 2 },
    ];
  }

  let allCampaigns: InstantlyCampaign[] = [];
  let skip = 0;
  const limit = 100;

  // Paginate through all campaigns
  while (true) {
    const res = await instantlyV2(apiKey, "GET", "/campaigns", undefined, {
      limit: String(limit),
      skip: String(skip),
    });
    const data = await res.json();

    // V2 returns an array directly, or { items: [...] } depending on version
    const items: any[] = Array.isArray(data)
      ? data
      : data.items ?? data.campaigns ?? [];

    for (const c of items) {
      allCampaigns.push({
        id: c.id ?? "",
        name: c.name ?? "Unnamed",
        status: typeof c.status === "number" ? c.status : 0,
      });
    }

    if (items.length < limit) break;
    skip += limit;
  }

  return allCampaigns;
}

/**
 * Get a single campaign by ID.
 * GET /api/v2/campaigns/{id}
 */
export async function getCampaign(
  apiKey: string,
  campaignId: string
): Promise<InstantlyCampaign | null> {
  if (DEV_MOCK) {
    return { id: campaignId, name: "Mock Campaign", status: 1 };
  }

  try {
    const res = await instantlyV2(
      apiKey,
      "GET",
      `/campaigns/${campaignId}`
    );
    const data = await res.json();
    return {
      id: data.id ?? campaignId,
      name: data.name ?? "Unnamed",
      status: typeof data.status === "number" ? data.status : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Create a new campaign.
 * POST /api/v2/campaigns
 *
 * The V2 API requires `campaign_schedule` with at least one schedule.
 * We create a sensible default (Mon-Fri 9-17 UTC).
 */
export async function createInstantlyCampaign(
  apiKey: string,
  name: string
): Promise<{ campaignId: string }> {
  if (DEV_MOCK) {
    return { campaignId: `mock-campaign-${Date.now()}` };
  }

  const res = await instantlyV2(apiKey, "POST", "/campaigns", {
    name,
    campaign_schedule: {
      schedules: [
        {
          name: "Default Schedule",
          timing: { from: "09:00", to: "17:00" },
          days: {
            0: false, // Sunday
            1: true, // Monday
            2: true, // Tuesday
            3: true, // Wednesday
            4: true, // Thursday
            5: true, // Friday
            6: false, // Saturday
          },
          timezone: "America/New_York",
        },
      ],
    },
  });

  const data = await res.json();
  const campaignId = data.id;
  if (!campaignId)
    throw new Error("No campaign ID returned from Instantly V2");

  return { campaignId };
}

/**
 * Activate (start) a campaign.
 * POST /api/v2/campaigns/{id}/activate
 */
export async function activateCampaign(
  apiKey: string,
  campaignId: string
): Promise<void> {
  if (DEV_MOCK) return;

  await instantlyV2(apiKey, "POST", `/campaigns/${campaignId}/activate`);
}

/**
 * Pause a campaign.
 * POST /api/v2/campaigns/{id}/pause
 */
export async function pauseCampaign(
  apiKey: string,
  campaignId: string
): Promise<void> {
  if (DEV_MOCK) return;

  await instantlyV2(apiKey, "POST", `/campaigns/${campaignId}/pause`);
}

/* -------------------------------------------------------------------------- */
/*  Lead operations                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Add a single lead to a campaign.
 * POST /api/v2/leads
 *
 * Docs: https://developer.instantly.ai/api/v2/lead/createlead
 * - `campaign` field = campaign UUID
 * - `skip_if_in_campaign: true` prevents duplicates
 */
async function addLeadToCampaign(
  apiKey: string,
  campaignId: string,
  lead: InstantlyLead
): Promise<void> {
  await instantlyV2(apiKey, "POST", "/leads", {
    campaign: campaignId,
    email: lead.email,
    first_name: lead.first_name ?? null,
    last_name: lead.last_name ?? null,
    company_name: lead.company_name ?? null,
    website: lead.website ?? null,
    phone: lead.phone ?? null,
    skip_if_in_campaign: true,
  });
}

/**
 * Push leads to an existing campaign, one at a time.
 * Uses the official V2 POST /api/v2/leads endpoint.
 *
 * We batch with a small concurrency to avoid rate limits (429s).
 * Instantly V2 rate limit: varies by plan, typically 10 req/s.
 */
export async function pushLeadsToExistingCampaign(
  apiKey: string,
  campaignId: string,
  leads: InstantlyLead[]
): Promise<{ added: number; skipped: number }> {
  if (DEV_MOCK) {
    return { added: leads.length, skipped: 0 };
  }

  let added = 0;
  let skipped = 0;
  const CONCURRENCY = 5;

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((lead) => addLeadToCampaign(apiKey, campaignId, lead))
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        added++;
      } else {
        // Check if the error is a duplicate skip (not a real failure)
        const msg = r.reason?.message ?? "";
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          skipped++;
        } else {
          // Log but don't throw — continue with remaining leads
          console.error("[Instantly] Lead add failed:", msg);
          skipped++;
        }
      }
    }

    // Small delay between batches to respect rate limits
    if (i + CONCURRENCY < leads.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { added, skipped };
}

/* -------------------------------------------------------------------------- */
/*  Connection test                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Verify the API key is valid by listing campaigns (limit=1).
 * Returns true if the key works.
 */
export async function testConnection(apiKey: string): Promise<boolean> {
  if (DEV_MOCK) return true;

  try {
    await instantlyV2(apiKey, "GET", "/campaigns", undefined, {
      limit: "1",
      skip: "0",
    });
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Status helpers                                                            */
/* -------------------------------------------------------------------------- */

export function campaignStatusLabel(status: number): string {
  return STATUS_LABELS[status] ?? `Unknown (${status})`;
}
