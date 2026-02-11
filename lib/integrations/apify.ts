import { ApifyClient } from "apify-client";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Input we build from ICP filters → sent to the Apify actor.
 *
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
  /** City-level geography — e.g. ["London"]. Never put a country here. */
  contact_city?: string[];
  /** Country-level geography — e.g. ["united kingdom"]. Never put a city here. */
  contact_location?: string[];
  /** Company headcount brackets — e.g. ["1-10","11-20","21-50",...] */
  size?: string[];
  /** Funding round types — e.g. ["seed","series_a",...] */
  funding?: string[];
  email_status?: string[];
  fetch_count?: number;
  file_name?: string;
}

export interface ApifyStartResult {
  runId: string;
  status: string;
  datasetId?: string;
}

export interface ApifyRunStatus {
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  datasetId?: string;
}

/** Shape of each item returned by the Apify actor (matches the sample JSON). */
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

// Mocking is OPT-IN: only mock when DEV_MOCK is explicitly "true"
const DEV_MOCK = process.env.DEV_MOCK === "true";

/** The specific Apify actor for lead scraping. */
const ACTOR_ID = "IoSHqwTR9YGhzccez";

function getClient(): ApifyClient {
  // Check both env var names — .env uses APIFY_TOKEN
  const token = process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN env var is required");
  return new ApifyClient({ token });
}

/**
 * Map a headcount range (min/max) to the exact size brackets the actor expects.
 *
 * Actor size brackets:
 *   "1-10", "11-20", "21-50", "51-100", "101-200", "201-500",
 *   "501-1000", "1001-2000", "2001-5000", "5001-10000",
 *   "10001-20000", "20001-50000", "50000+"
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

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Start an Apify actor run.
 *
 * Uses .call() which runs the actor and waits for it to finish.
 * This means we get the datasetId back immediately in the response.
 *
 * Reference (exact pattern from Apify docs):
 *   const run = await client.actor("IoSHqwTR9YGhzccez").call(input);
 *   const { items } = await client.dataset(run.defaultDatasetId).listItems();
 */
export async function startApifyRun(
  input: ApifyRunInput
): Promise<ApifyStartResult> {
  if (DEV_MOCK) {
    return {
      runId: `mock-run-${Date.now()}`,
      status: "SUCCEEDED",
      datasetId: "mock-dataset-id",
    };
  }

  const client = getClient();

  // Build the actor input — always include the base fields
  const actorInput: Record<string, unknown> = {
    fetch_count: input.fetch_count ?? 100,
    file_name: input.file_name ?? "Prospects",
    email_status: input.email_status ?? ["validated"],
  };

  // Add optional ICP filters only if present
  if (input.company_keywords?.length) {
    actorInput.company_keywords = input.company_keywords;
  }
  if (input.contact_job_title?.length) {
    actorInput.contact_job_title = input.contact_job_title;
  }
  // IMPORTANT: contact_city is for CITIES only, contact_location is for COUNTRIES only
  // Never put a country into contact_city or a city into contact_location
  if (input.contact_city?.length) {
    actorInput.contact_city = input.contact_city;
  }
  if (input.contact_location?.length) {
    actorInput.contact_location = input.contact_location;
  }
  // Actor uses "size" for company headcount brackets
  if (input.size?.length) {
    actorInput.size = input.size;
  }
  if (input.funding?.length) {
    actorInput.funding = input.funding;
  }

  console.log(
    "[Apify] Starting actor run with input:",
    JSON.stringify(actorInput)
  );

  // .call() runs the actor and waits for it to finish
  const run = await client.actor(ACTOR_ID).call(actorInput);

  console.log("[Apify] Run completed:", {
    id: run.id,
    status: run.status,
    datasetId: run.defaultDatasetId,
  });

  return {
    runId: run.id,
    status: run.status ?? "SUCCEEDED",
    datasetId: run.defaultDatasetId,
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
 * Fetch the dataset items from a completed Apify run.
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
        job_title: "VP Sales",
        company_name: "Example Inc",
        company_domain: "example.com",
        linkedin: "https://linkedin.com/in/janedoe",
        city: "London",
        country: "United Kingdom",
        industry: "B2B SaaS",
        company_size: 50,
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
