const DEV_MOCK = process.env.NODE_ENV === "development" && process.env.DEV_MOCK !== "false";

export interface InstantlyLead {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
}

export interface InstantlySequence {
  emails: Array<{ subject: string; body: string }>;
}

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
}

export interface InstantlySyncResult {
  campaignId: string;
  campaignName: string;
  status: string;
  leadsAdded: number;
}

async function instantlyFetch(path: string, options: RequestInit = {}) {
  const apiKey = process.env.INSTANTLY_API_KEY;
  const base = "https://api.instantly.ai/api/v1";
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const workspaceId = process.env.INSTANTLY_WORKSPACE_ID ?? "";
  const params = new URL(url).searchParams;
  if (workspaceId && !params.has("workspace_id")) {
    const sep = url.includes("?") ? "&" : "?";
    return fetch(`${url}${sep}workspace_id=${workspaceId}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly API error: ${res.status} ${text}`);
  }
  return res;
}

export async function createOrGetCampaign(
  name: string,
  sequence: InstantlySequence
): Promise<{ campaignId: string; isNew: boolean }> {
  if (DEV_MOCK) {
    return {
      campaignId: `mock-campaign-${Date.now()}`,
      isNew: true,
    };
  }

  if (!process.env.INSTANTLY_API_KEY) {
    throw new Error("INSTANTLY_API_KEY must be set");
  }

  const listRes = await instantlyFetch(
    `/campaign/list?api_key=${process.env.INSTANTLY_API_KEY}&workspace_id=${process.env.INSTANTLY_WORKSPACE_ID}`
  );
  const list = await listRes.json();
  const existing = Array.isArray(list) ? list : list.campaigns ?? [];
  const found = existing.find((c: { name?: string }) => c.name === name);
  if (found?.id) {
    return { campaignId: found.id, isNew: false };
  }

  const createRes = await fetch(
    `${process.env.INSTANTLY_API_BASE ?? "https://api.instantly.ai"}/api/v1/campaign/create`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.INSTANTLY_API_KEY,
        workspace_id: process.env.INSTANTLY_WORKSPACE_ID,
        name,
        sequence,
      }),
    }
  );
  if (!createRes.ok) throw new Error(`Failed to create campaign: ${await createRes.text()}`);
  const created = await createRes.json();
  const campaignId = created.id ?? created.campaign_id;
  if (!campaignId) throw new Error("No campaign id in create response");
  return { campaignId, isNew: true };
}

export async function pushLeadsToExistingCampaign(
  apiKey: string,
  workspaceId: string,
  campaignId: string,
  leads: InstantlyLead[]
): Promise<{ added: number }> {
  if (DEV_MOCK) {
    return { added: leads.length };
  }
  const BATCH = 100;
  let added = 0;
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    const res = await fetch(
      `https://api.instantly.ai/api/v1/lead/add?api_key=${apiKey}&workspace_id=${workspaceId}&campaign_id=${campaignId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: batch }),
      }
    );
    if (!res.ok) throw new Error(`Failed to add leads: ${await res.text()}`);
    added += batch.length;
  }
  return { added };
}

export async function pushLeadsToCampaign(
  campaignId: string,
  leads: InstantlyLead[]
): Promise<{ added: number }> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  const workspaceId = process.env.INSTANTLY_WORKSPACE_ID ?? "";
  if (!apiKey || !workspaceId) throw new Error("INSTANTLY_API_KEY and INSTANTLY_WORKSPACE_ID must be set");
  return pushLeadsToExistingCampaign(apiKey, workspaceId, campaignId, leads);
}

export async function listCampaigns(apiKey: string, workspaceId: string): Promise<InstantlyCampaign[]> {
  if (DEV_MOCK) {
    return [{ id: "mock-1", name: "Campaign 1", status: "active" }];
  }
  const res = await fetch(
    `https://api.instantly.ai/api/v1/campaign/list?api_key=${encodeURIComponent(apiKey)}&workspace_id=${encodeURIComponent(workspaceId)}`
  );
  if (!res.ok) throw new Error(`Instantly API: ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.campaigns ?? [];
  return list.map((c: { id?: string; name?: string; status?: string }) => ({
    id: c.id ?? "",
    name: c.name ?? "Unnamed",
    status: c.status ?? "",
  }));
}

export async function startCampaign(campaignId: string): Promise<void> {
  if (DEV_MOCK) return;

  const res = await fetch(
    `https://api.instantly.ai/api/v1/campaign/launch?api_key=${process.env.INSTANTLY_API_KEY}&workspace_id=${process.env.INSTANTLY_WORKSPACE_ID}&campaign_id=${campaignId}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Failed to start campaign: ${await res.text()}`);
}

export async function syncToInstantly(
  campaignName: string,
  sequence: InstantlySequence,
  leads: InstantlyLead[]
): Promise<InstantlySyncResult> {
  if (DEV_MOCK) {
    return {
      campaignId: `mock-${Date.now()}`,
      campaignName,
      status: "active",
      leadsAdded: leads.length,
    };
  }

  const { campaignId, isNew } = await createOrGetCampaign(campaignName, sequence);
  const { added } = await pushLeadsToCampaign(campaignId, leads);
  if (isNew) await startCampaign(campaignId);
  return {
    campaignId,
    campaignName,
    status: "active",
    leadsAdded: added,
  };
}
