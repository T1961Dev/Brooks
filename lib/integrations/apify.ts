import { ApifyClient } from "apify-client";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Field names match the actor's expected input EXACTLY:
 *   company_keywords  – industry / niche keywords
 *   contact_job_title – job titles to target
 *   contact_city      – city-level location (e.g. "London")
 *   contact_location  – country-level location (e.g. "united kingdom")
 *     ** NEVER put a country in contact_city or a city in contact_location **
 *   size              – company headcount brackets
 *   funding           – funding round types
 *   email_status      – e.g. ["validated"]
 *   fetch_count       – how many leads to scrape
 *   file_name         – dataset file tag
 */
export interface ApifyRunInput {
  company_keywords?: string[];
  contact_job_title?: string[];
  contact_city?: string[];
  contact_location?: string[];
  size?: string[];
  funding?: string[];
  email_status?: string[];
  fetch_count?: number;
  file_name?: string;
}

export interface ApifyRunResult {
  runId: string;
  status: string;
  datasetId: string;
  items: ApifyDatasetItem[];
}

export interface ApifyRunStatus {
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  datasetId?: string;
}

export interface ApifyDatasetItem {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  personal_email?: string | null;
  company_name?: string | null;
  company_website?: string | null;
  linkedin?: string | null;
  job_title?: string | null;
  industry?: string | null;
  headline?: string | null;
  seniority_level?: string | null;
  company_linkedin?: string | null;
  functional_level?: string | null;
  company_size?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  company_annual_revenue?: string | null;
  company_annual_revenue_clean?: string | null;
  company_description?: string | null;
  company_total_funding?: string | null;
  company_total_funding_clean?: string | null;
  keywords?: string | null;
  company_technologies?: string | null;
  company_linkedin_uid?: string | null;
  company_founded_year?: string | null;
  company_domain?: string | null;
  company_phone?: string | null;
  company_street_address?: string | null;
  company_full_address?: string | null;
  company_state?: string | null;
  company_city?: string | null;
  company_country?: string | null;
  company_postal_code?: string | null;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const DEV_MOCK = process.env.DEV_MOCK === "true";
const ACTOR_ID = "IoSHqwTR9YGhzccez";

function getClient(): ApifyClient {
  const token = process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN env var is required");
  return new ApifyClient({ token });
}

/**
 * Map a headcount range (min/max) to the exact size brackets the actor expects.
 */
export function headcountToSizeFilter(
  min?: number | null,
  max?: number | null
): string[] {
  if (!min && !max) return [];
  const brackets = [
    { label: "1-10", lo: 1, hi: 10 },
    { label: "11-20", lo: 11, hi: 20 },
    { label: "21-50", lo: 21, hi: 50 },
    { label: "51-100", lo: 51, hi: 100 },
    { label: "101-200", lo: 101, hi: 200 },
    { label: "201-500", lo: 201, hi: 500 },
    { label: "501-1000", lo: 501, hi: 1000 },
    { label: "1001-2000", lo: 1001, hi: 2000 },
    { label: "2001-5000", lo: 2001, hi: 5000 },
    { label: "5001-10000", lo: 5001, hi: 10000 },
    { label: "10001-20000", lo: 10001, hi: 20000 },
    { label: "20001-50000", lo: 20001, hi: 50000 },
    { label: "50000+", lo: 50001, hi: Infinity },
  ];
  const lo = min ?? 0;
  const hi = max ?? Infinity;
  return brackets
    .filter((b) => b.lo <= hi && b.hi >= lo)
    .map((b) => b.label);
}

/**
 * Maps ICP industry names → Apollo/Apify industry field values.
 * Used for post-scrape filtering since Apify returns standard LinkedIn/Apollo
 * industry names (e.g. "Computer Software") not our ICP labels ("B2B SaaS").
 */
export const INDUSTRY_ALIASES: Record<string, string[]> = {
  "b2b saas": [
    "computer software", "saas", "software", "internet",
    "information technology and services", "information technology & services",
    "software development", "computer & network security",
    "computer networking", "cloud computing",
  ],
  fintech: [
    "financial services", "financial technology", "fintech", "banking",
    "investment management", "capital markets", "payments",
  ],
  healthcare: [
    "hospital & health care", "health, wellness and fitness",
    "medical devices", "pharmaceuticals", "biotechnology",
    "mental health care", "health care",
  ],
  "e-commerce": [
    "e-commerce", "ecommerce", "retail", "internet",
    "consumer goods", "consumer electronics", "online media",
  ],
  "professional services": [
    "professional services", "management consulting", "accounting",
    "human resources", "staffing and recruiting", "legal services",
  ],
  manufacturing: [
    "manufacturing", "industrial automation", "machinery",
    "mechanical or industrial engineering",
    "electrical/electronic manufacturing", "plastics",
  ],
  "real estate": [
    "real estate", "commercial real estate",
  ],
  education: [
    "education", "e-learning", "higher education",
    "education management", "primary/secondary education",
  ],
  media: [
    "media production", "online media", "broadcast media",
    "publishing", "entertainment", "music",
  ],
  consulting: [
    "management consulting", "consulting",
    "information technology and services",
    "information technology & services", "business consulting",
  ],
  insurance: ["insurance", "financial services"],
  legal: ["legal services", "law practice"],
  construction: [
    "construction", "building materials", "civil engineering",
    "architecture & planning",
  ],
  transportation: [
    "transportation/trucking/railroad", "logistics and supply chain",
    "aviation & aerospace", "maritime", "transportation",
  ],
  retail: [
    "retail", "consumer goods", "food & beverages",
    "supermarkets", "apparel & fashion",
  ],
  technology: [
    "information technology and services",
    "information technology & services",
    "computer software", "internet", "computer hardware",
    "semiconductors", "computer networking",
    "computer & network security", "technology",
  ],
  "marketing agency": [
    "marketing and advertising", "marketing & advertising",
    "advertising", "public relations and communications",
    "public relations & communications", "design", "graphic design",
  ],
  "financial services": [
    "financial services", "banking", "investment management",
    "venture capital & private equity", "capital markets",
  ],
  "non-profit": [
    "nonprofit organization management", "philanthropy",
    "civic & social organization", "fund-raising",
  ],
};

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Run the Apify actor and fetch results — mirrors the reference pattern exactly:
 *
 *   const run = await client.actor("IoSHqwTR9YGhzccez").call(input);
 *   const { items } = await client.dataset(run.defaultDatasetId).listItems();
 *
 * Returns BOTH run metadata AND the dataset items in one call.
 */
export async function runActorAndFetchItems(
  input: ApifyRunInput
): Promise<ApifyRunResult> {
  if (DEV_MOCK) {
    return {
      runId: `mock-run-${Date.now()}`,
      status: "SUCCEEDED",
      datasetId: "mock-dataset-id",
      items: [
        {
          first_name: "Jane",
          last_name: "Doe",
          email: "jane@example.com",
          job_title: "CEO",
          company_name: "Example SaaS Inc",
          company_domain: "example.com",
          linkedin: "https://linkedin.com/in/janedoe",
          city: "San Francisco",
          country: "United States",
          industry: "Computer Software",
          company_size: 35,
          company_website: "https://example.com",
          company_annual_revenue: "$15M",
        },
      ],
    };
  }

  const client = getClient();

  const actorInput: Record<string, unknown> = {
    fetch_count: input.fetch_count ?? 100,
    file_name: input.file_name ?? "Prospects",
    email_status: input.email_status ?? ["validated"],
  };

  if (input.company_keywords?.length) {
    actorInput.company_keywords = input.company_keywords;
  }
  if (input.contact_job_title?.length) {
    actorInput.contact_job_title = input.contact_job_title;
  }
  if (input.contact_city?.length) {
    actorInput.contact_city = input.contact_city;
  }
  if (input.contact_location?.length) {
    actorInput.contact_location = input.contact_location;
  }
  if (input.size?.length) {
    actorInput.size = input.size;
  }
  if (input.funding?.length) {
    actorInput.funding = input.funding;
  }

  console.log("[Apify] Starting actor with input:", JSON.stringify(actorInput));

  // Step 1: Run the actor and wait for it to finish
  const run = await client.actor(ACTOR_ID).call(actorInput);

  console.log("[Apify] Run completed:", {
    id: run.id,
    status: run.status,
    datasetId: run.defaultDatasetId,
  });

  if (!run.defaultDatasetId) {
    throw new Error(
      `Apify run ${run.id} completed with status ${run.status} but no datasetId`
    );
  }

  // Step 2: Immediately fetch results from the dataset (same pattern as reference)
  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems();

  console.log(`[Apify] Fetched ${items.length} items from dataset ${run.defaultDatasetId}`);

  if (items.length > 0) {
    const sample = items[0] as ApifyDatasetItem;
    console.log("[Apify] Sample item fields:", {
      industry: sample.industry,
      job_title: sample.job_title,
      company_size: sample.company_size,
      country: sample.country,
      company_name: sample.company_name,
    });
  }

  return {
    runId: run.id,
    status: run.status ?? "SUCCEEDED",
    datasetId: run.defaultDatasetId,
    items: items as ApifyDatasetItem[],
  };
}

/**
 * Check the status of an existing Apify run.
 */
export async function getApifyRunStatus(
  runId: string
): Promise<ApifyRunStatus> {
  if (DEV_MOCK && runId.startsWith("mock-run-")) {
    return { status: "SUCCEEDED", datasetId: "mock-dataset-id" };
  }

  const client = getClient();
  const run = await client.run(runId).get();
  if (!run) throw new Error(`Apify run ${runId} not found`);

  const mapped: ApifyRunStatus["status"] =
    run.status === "SUCCEEDED"
      ? "SUCCEEDED"
      : run.status === "FAILED" ||
          run.status === "ABORTED" ||
          run.status === "TIMED-OUT"
        ? "FAILED"
        : "RUNNING";

  return { status: mapped, datasetId: run.defaultDatasetId };
}

/**
 * Fetch items from an Apify dataset (for re-fetching in process route).
 */
export async function getApifyDatasetItems(
  datasetId: string
): Promise<ApifyDatasetItem[]> {
  if (DEV_MOCK && datasetId === "mock-dataset-id") {
    return [
      {
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
        job_title: "CEO",
        company_name: "Example SaaS Inc",
        company_domain: "example.com",
        linkedin: "https://linkedin.com/in/janedoe",
        city: "San Francisco",
        country: "United States",
        industry: "Computer Software",
        company_size: 35,
        company_website: "https://example.com",
      },
    ];
  }

  const client = getClient();
  console.log("[Apify] Fetching dataset items:", datasetId);
  const { items } = await client.dataset(datasetId).listItems();
  console.log("[Apify] Got", items.length, "items from dataset");
  return items as ApifyDatasetItem[];
}
