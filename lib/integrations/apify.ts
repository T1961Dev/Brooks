const DEV_MOCK = process.env.NODE_ENV === "development" && process.env.DEV_MOCK !== "false";

export interface ApifyRunInput {
  nicheKeywords?: string[];
  targetTitles?: string[];
  geography?: string;
  companySizeMin?: number;
  companySizeMax?: number;
  techFilters?: string[];
}

export interface ApifyStartResult {
  runId: string;
  status: string;
}

export interface ApifyRunStatus {
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  datasetId?: string;
}

export interface ApifyDatasetItem {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  company?: string;
  domain?: string;
  linkedInUrl?: string;
  location?: string;
  [key: string]: unknown;
}

async function apifyFetch(path: string, options: RequestInit = {}) {
  const token = process.env.APIFY_TOKEN;
  const base = "https://api.apify.com/v2";
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify API error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function startApifyRun(input: ApifyRunInput): Promise<ApifyStartResult> {
  if (DEV_MOCK) {
    return {
      runId: `mock-run-${Date.now()}`,
      status: "RUNNING",
    };
  }

  const actorId = process.env.APIFY_ACTOR_ID;
  if (!actorId || !process.env.APIFY_TOKEN) {
    throw new Error("APIFY_ACTOR_ID and APIFY_TOKEN must be set");
  }

  const body = {
    nicheKeywords: input.nicheKeywords ?? [],
    targetTitles: input.targetTitles ?? [],
    geography: input.geography ?? "",
    companySizeMin: input.companySizeMin ?? 10,
    companySizeMax: input.companySizeMax ?? 500,
    techFilters: input.techFilters ?? [],
  };

  const data = await apifyFetch(`/acts/${actorId}/runs`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    runId: data.data?.id ?? data.id,
    status: data.data?.status ?? "RUNNING",
  };
}

export async function getApifyRunStatus(runId: string): Promise<ApifyRunStatus> {
  if (DEV_MOCK && runId.startsWith("mock-run-")) {
    return { status: "SUCCEEDED", datasetId: "mock-dataset-id" };
  }

  const actorId = process.env.APIFY_ACTOR_ID;
  if (!actorId || !process.env.APIFY_TOKEN) {
    throw new Error("APIFY_ACTOR_ID and APIFY_TOKEN must be set");
  }

  const data = await apifyFetch(`/actor-runs/${runId}`);
  const status = data.data?.status ?? data.status;
  const datasetId = data.data?.defaultDatasetId ?? data.defaultDatasetId;

  const mapped: "RUNNING" | "SUCCEEDED" | "FAILED" =
    status === "SUCCEEDED" ? "SUCCEEDED" : status === "FAILED" ? "FAILED" : "RUNNING";

  return { status: mapped, datasetId };
}

export async function getApifyDatasetItems(datasetId: string): Promise<ApifyDatasetItem[]> {
  if (DEV_MOCK && datasetId === "mock-dataset-id") {
    return [
      {
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
        title: "VP Sales",
        company: "Example Inc",
        domain: "example.com",
        linkedInUrl: "https://linkedin.com/in/janedoe",
        location: "San Francisco, CA",
      },
      {
        email: "john@acme.com",
        firstName: "John",
        lastName: "Smith",
        title: "Head of Growth",
        company: "Acme Corp",
        domain: "acme.com",
        location: "New York, NY",
      },
    ];
  }

  const data = await apifyFetch(`/datasets/${datasetId}/items`);
  return Array.isArray(data) ? data : data.items ?? [];
}
