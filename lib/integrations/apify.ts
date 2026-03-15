import { ApifyClient } from "apify-client";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ApifyRunInput {
  company_domain?: string[];
  company_industry?: string[];
  company_keywords?: string[];
  contact_job_title?: string[];
  contact_location?: string[];
  contact_not_city?: string[];
  contact_not_location?: string[];
  funding?: string[];
  city?: string;
  email_status?: string[];
  fetch_count?: number;
  file_name?: string;
  min_revenue?: string;
  max_revenue?: string;
  size?: string[];
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
 * Map a headcount range (min/max) to the exact employee size buckets the new
 * actor expects.
 */
export function headcountToSizeFilter(
  min?: number | null,
  max?: number | null
): string[] {
  if (!min && !max) return [];
  const brackets = [
    { label: "0 - 1", lo: 0, hi: 1 },
    { label: "2 - 10", lo: 2, hi: 10 },
    { label: "11 - 50", lo: 11, hi: 50 },
    { label: "51 - 200", lo: 51, hi: 200 },
    { label: "201 - 500", lo: 201, hi: 500 },
    { label: "501 - 1000", lo: 501, hi: 1000 },
    { label: "1001 - 5000", lo: 1001, hi: 5000 },
    { label: "5001 - 10000", lo: 5001, hi: 10000 },
    { label: "10000+", lo: 10001, hi: Infinity },
  ];
  const lo = min ?? 0;
  const hi = max ?? Infinity;
  return brackets
    .filter((b) => b.lo <= hi && b.hi >= lo)
    .map((b) => b.label);
}

/**
 * Map a revenue min/max range to the actor's revenue buckets.
 */
export function revenueToActorFilter(
  min?: number | null,
  max?: number | null
): string[] {
  if (!min && !max) return [];
  const brackets = [
    { label: "< 1M", lo: 0, hi: 1_000_000 },
    { label: "1M-10M", lo: 1_000_000, hi: 10_000_000 },
    { label: "11M-100M", lo: 10_000_000, hi: 100_000_000 },
    { label: "101M-500M", lo: 100_000_000, hi: 500_000_000 },
    { label: "501M-1B", lo: 500_000_000, hi: 1_000_000_000 },
    { label: "1B+", lo: 1_000_000_000, hi: Infinity },
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

function getRecordValue(
  record: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (record[key] != null) return record[key];
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function firstEmailFromField(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  const first = text
    .split(/[;,]/)
    .map((part) => part.trim())
    .find(Boolean);
  return first ?? null;
}

function parseEmployeeSize(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = asString(value);
  if (!text) return null;
  const normalized = text.replace(/,/g, "").trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  if (normalized.includes("+")) {
    const base = Number(normalized.replace(/[^\d]/g, ""));
    return Number.isFinite(base) ? base : null;
  }
  const matches = normalized.match(/\d+/g);
  if (!matches?.length) return null;
  if (matches.length === 1) return Number(matches[0]);
  const lo = Number(matches[0]);
  const hi = Number(matches[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return Math.round((lo + hi) / 2);
}

function deriveDomain(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();
}

function normalizeDatasetItem(raw: unknown): ApifyDatasetItem {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const companyWebsite = asString(
    getRecordValue(
      record,
      "company_website",
      "companyWebsite",
      "website",
      "organizationWebsite"
    )
  );
  const companyDomain =
    asString(getRecordValue(record, "company_domain", "companyDomain", "domain")) ??
    deriveDomain(companyWebsite);

  return {
    first_name: asString(getRecordValue(record, "first_name", "firstName")),
    last_name: asString(getRecordValue(record, "last_name", "lastName")),
    full_name: asString(
      getRecordValue(record, "full_name", "fullName", "name", "personName", "fullName")
    ),
    email: firstEmailFromField(
      getRecordValue(record, "email", "workEmail", "emailAddress", "work_email")
    ),
    mobile_number: asString(
      getRecordValue(
        record,
        "mobile_number",
        "mobileNumber",
        "phone",
        "phoneNumber",
        "phone_numbers"
      )
    ),
    personal_email: asString(
      getRecordValue(record, "personal_email", "personalEmail")
    ),
    company_name: asString(
      getRecordValue(record, "company_name", "companyName", "organizationName")
    ),
    company_website: companyWebsite,
    linkedin: asString(
      getRecordValue(record, "linkedin", "linkedinUrl", "personLinkedinUrl")
    ),
    job_title: asString(
      getRecordValue(
        record,
        "job_title",
        "jobTitle",
        "title",
        "position",
        "role"
      )
    ),
    industry: asString(
      getRecordValue(
        record,
        "industry",
        "companyIndustry",
        "company_industry",
        "companyCategory",
        "organizationIndustry"
      )
    ),
    headline: asString(getRecordValue(record, "headline", "personHeadline")),
    seniority_level: asString(
      getRecordValue(record, "seniority_level", "seniorityLevel", "seniority")
    ),
    company_linkedin: asString(
      getRecordValue(
        record,
        "company_linkedin",
        "companyLinkedin",
        "companyLinkedinUrl",
        "organizationLinkedinUrl"
      )
    ),
    functional_level: asString(
      getRecordValue(record, "functional_level", "functionalLevel", "functional")
    ),
    company_size: parseEmployeeSize(
      getRecordValue(
        record,
        "company_size",
        "companyEmployeeSize",
        "employeeSize",
        "organizationSize"
      )
    ),
    city: asString(
      getRecordValue(record, "city", "personCity", "companyCity", "organizationCity")
    ),
    state: asString(
      getRecordValue(record, "state", "personState", "companyState", "organizationState")
    ),
    country: asString(
      getRecordValue(record, "country", "personCountry", "companyCountry", "organizationCountry")
    ),
    company_annual_revenue: asString(
      getRecordValue(record, "company_annual_revenue", "companyRevenue", "revenue")
    ),
    company_annual_revenue_clean: asString(
      getRecordValue(
        record,
        "company_annual_revenue_clean",
        "companyRevenueClean",
        "revenue"
      )
    ),
    company_description: asString(
      getRecordValue(
        record,
        "company_description",
        "companyDescription",
        "description",
        "organizationDescription"
      )
    ),
    company_total_funding: asString(
      getRecordValue(record, "company_total_funding", "companyTotalFunding")
    ),
    company_total_funding_clean: asString(
      getRecordValue(record, "company_total_funding_clean", "companyTotalFundingClean")
    ),
    keywords: asString(
      getRecordValue(record, "keywords", "industryKeywords", "organizationSpecialities")
    ),
    company_technologies: asString(
      getRecordValue(record, "company_technologies", "companyTechnologies")
    ),
    company_linkedin_uid: asString(
      getRecordValue(record, "company_linkedin_uid", "companyLinkedinUid")
    ),
    company_founded_year: asString(
      getRecordValue(record, "company_founded_year", "companyFoundedYear")
    ),
    company_domain: companyDomain,
    company_phone: asString(
      getRecordValue(record, "company_phone", "companyPhone", "phone")
    ),
    company_street_address: asString(
      getRecordValue(record, "company_street_address", "companyStreetAddress")
    ),
    company_full_address: asString(
      getRecordValue(record, "company_full_address", "companyFullAddress")
    ),
    company_state: asString(
      getRecordValue(record, "company_state", "companyState", "organizationState")
    ),
    company_city: asString(
      getRecordValue(record, "company_city", "companyCity", "organizationCity")
    ),
    company_country: asString(
      getRecordValue(record, "company_country", "companyCountry", "organizationCountry")
    ),
    company_postal_code: asString(
      getRecordValue(record, "company_postal_code", "companyPostalCode")
    ),
    ...record,
  };
}

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
    email_status: input.email_status?.length ? input.email_status : ["validated"],
  };

  if (input.company_keywords?.length) actorInput.company_keywords = input.company_keywords;
  if (input.company_domain?.length) actorInput.company_domain = input.company_domain;
  if (input.company_industry?.length) actorInput.company_industry = input.company_industry;
  if (input.contact_job_title?.length) actorInput.contact_job_title = input.contact_job_title;
  if (input.contact_location?.length) actorInput.contact_location = input.contact_location;
  if (input.contact_not_city?.length) actorInput.contact_not_city = input.contact_not_city;
  if (input.contact_not_location?.length) actorInput.contact_not_location = input.contact_not_location;
  if (input.funding?.length) actorInput.funding = input.funding;
  if (input.city) actorInput.city = input.city;
  if (input.min_revenue) actorInput.min_revenue = input.min_revenue;
  if (input.max_revenue) actorInput.max_revenue = input.max_revenue;
  if (input.size?.length) actorInput.size = input.size;

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
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const normalizedItems = items.map(normalizeDatasetItem);

  console.log(
    `[Apify] Fetched ${normalizedItems.length} items from dataset ${run.defaultDatasetId}`
  );

  if (normalizedItems.length > 0) {
    const sample = normalizedItems[0];
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
    items: normalizedItems,
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
  return items.map(normalizeDatasetItem);
}
