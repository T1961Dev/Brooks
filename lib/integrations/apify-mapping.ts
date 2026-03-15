export type ActorMappingIcp = {
  industries?: string[] | null;
  industry_keywords?: string[] | null;
  geography?: string | null;
  headcount_brackets?: string[] | null;
  headcount_min?: number | null;
  headcount_max?: number | null;
  revenue_min?: number | null;
  revenue_max?: number | null;
  job_titles?: string[] | null;
  company_type?: string | null;
};

export type LegacyActorOverrides = {
  company_domain?: string[] | null;
  company_industry?: string[] | null;
  company_keywords?: string[] | null;
  contact_job_title?: string[] | null;
  contact_location?: string[] | null;
  contact_not_city?: string[] | null;
  contact_not_location?: string[] | null;
  email_status?: string[] | null;
  funding?: string[] | null;
  min_revenue?: string | null;
  max_revenue?: string | null;
  size?: string[] | null;
  city?: string | null;
};

export type LegacyActorInputPreview = {
  company_domain?: string[];
  company_industry?: string[];
  company_keywords?: string[];
  contact_job_title?: string[];
  contact_location?: string[];
  contact_not_city?: string[];
  contact_not_location?: string[];
  funding?: string[];
  city?: string;
  email_status: string[];
  fetch_count: number;
  file_name: "Prospects";
  min_revenue?: string;
  max_revenue?: string;
  size?: string[];
};

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states",
  us: "united states",
  uk: "united kingdom",
  gb: "united kingdom",
  de: "germany",
  fr: "france",
  au: "australia",
  nl: "netherlands",
  es: "spain",
  it: "italy",
  ca: "canada",
};

const LEGACY_HEADCOUNT_TO_ACTOR: Record<string, string[]> = {
  "1-10": ["1-10"],
  "11-50": ["11-20", "21-50"],
  "51-200": ["51-100", "101-200"],
  "201-500": ["201-500"],
  "501-1000": ["501-1000"],
  "1001-5000": ["1001-2000", "2001-5000"],
  "5001+": ["5001-10000", "10001-20000", "20001-50000", "50000+"],
};

const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  crm: [
    "crm software",
    "customer relationship management",
    "customer relationship management software",
  ],
  saas: [
    "saas",
    "software as a service",
    "saas platform",
    "b2b saas",
  ],
  startup: [
    "startup",
    "early stage startup",
    "venture backed startup",
  ],
};

function expandCompanyKeywords(rawKeywords: string[]): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(v);
  };

  rawKeywords.forEach(push);

  const tokenSet = new Set<string>();
  for (const keyword of rawKeywords) {
    const normalized = keyword.toLowerCase().trim();
    if (!normalized) continue;
    tokenSet.add(normalized);
    for (const token of normalized.split(/[^a-z0-9+]+/)) {
      if (token) tokenSet.add(token);
    }
  }

  for (const token of tokenSet) {
    for (const expansion of KEYWORD_EXPANSIONS[token] ?? []) {
      push(expansion);
    }
  }

  const hasCrm = tokenSet.has("crm") || tokenSet.has("customer relationship management");
  const hasSaas = tokenSet.has("saas") || tokenSet.has("software as a service");
  const hasStartup =
    tokenSet.has("startup") || tokenSet.has("start-up") || tokenSet.has("early stage");

  if (hasCrm && hasSaas) {
    push("crm saas");
    push("crm saas platform");
    push("saas crm software");
  }
  if (hasSaas && hasStartup) {
    push("saas startup");
    push("b2b saas startup");
  }
  if (hasCrm && hasStartup) {
    push("crm startup");
  }

  // Keep payload focused to avoid diluting intent too much.
  return ordered.slice(0, 15);
}

export function headcountToActorSize(
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
    .map((b) => b.label)
    .filter(Boolean);
}

function revenueValueToLegacyString(value: number): string {
  if (value >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  return `${Math.round(value / 1_000)}K`;
}

export function revenueToActorFilter(
  min?: number | null,
  max?: number | null
): { min_revenue?: string; max_revenue?: string } {
  const out: { min_revenue?: string; max_revenue?: string } = {};
  if (min && min > 0) out.min_revenue = revenueValueToLegacyString(min);
  if (max && max > 0) out.max_revenue = revenueValueToLegacyString(max);
  return out;
}

export function validateLegacyActorInput(input: LegacyActorInputPreview): string[] {
  const issues: string[] = [];
  if (!Array.isArray(input.company_industry) || input.company_industry.length === 0) {
    issues.push("Field input.company_industry is required");
  }
  if (!Number.isFinite(input.fetch_count) || input.fetch_count < 1) {
    issues.push("Field input.fetch_count must be a positive number");
  }
  const allowedEmailStatuses = new Set(["validated", "not_validated", "unknown"]);
  if (!Array.isArray(input.email_status) || input.email_status.length === 0) {
    issues.push("Field input.email_status must include at least one value");
  } else if (input.email_status.some((status) => !allowedEmailStatuses.has(status))) {
    issues.push(
      'Field input.email_status must be any of: "validated", "not_validated", "unknown"'
    );
  }
  return issues;
}

export function normalizeCountryForActor(
  geography?: string | null
): string[] | undefined {
  if (!geography || geography === "Global") return undefined;
  const raw = geography.toLowerCase().trim();
  const fallback = raw;
  const resolved = (COUNTRY_ALIASES[raw] ?? fallback).toLowerCase().trim();
  return [resolved];
}

export function buildLegacyActorInput(
  icp: ActorMappingIcp,
  fetchCount: number,
  options?: LegacyActorOverrides
): LegacyActorInputPreview {
  const selectedHeadcountBrackets = (icp.headcount_brackets ?? []).filter(
    Boolean
  ) as string[];
  const size =
    selectedHeadcountBrackets.length > 0
      ? Array.from(
          new Set(
            selectedHeadcountBrackets.flatMap(
              (b: string) => LEGACY_HEADCOUNT_TO_ACTOR[b] ?? []
            )
          )
        )
      : headcountToActorSize(
          icp.headcount_min ?? null,
          icp.headcount_max ?? null
        );

  const revenue = revenueToActorFilter(
    icp.revenue_min ?? null,
    icp.revenue_max ?? null
  );
  const normalizedLocation = normalizeCountryForActor(icp.geography);
  const city = options?.city?.trim() || "";
  const normalizedOverrideLocation = Array.from(
    new Set((options?.contact_location ?? []).map((v) => v.toLowerCase().trim()).filter(Boolean))
  );
  const normalizedExcludeLocation = Array.from(
    new Set(
      (options?.contact_not_location ?? [])
        .map((v) => v.toLowerCase().trim())
        .filter(Boolean)
    )
  );
  const normalizedExcludeCity = Array.from(
    new Set((options?.contact_not_city ?? []).map((v) => v.trim()).filter(Boolean))
  );
  const normalizedDomains = Array.from(
    new Set((options?.company_domain ?? []).map((v) => v.trim().toLowerCase()).filter(Boolean))
  );
  const normalizedFunding = Array.from(
    new Set((options?.funding ?? []).map((v) => v.trim().toLowerCase()).filter(Boolean))
  );
  const normalizedEmailStatuses = Array.from(
    new Set((options?.email_status ?? []).map((v) => v.trim().toLowerCase()).filter(Boolean))
  );
  const companyKeywords = expandCompanyKeywords(
    Array.from(
      new Set(((icp.industry_keywords ?? []).filter(Boolean) as string[]))
    )
  );
  const overrideKeywords = Array.from(
    new Set(((options?.company_keywords ?? []).filter(Boolean) as string[]))
  );
  const companyIndustry = Array.from(
    new Set(((icp.industries ?? []).filter(Boolean) as string[]))
  ).map((value) => value.toLowerCase().trim());
  const overrideIndustry = Array.from(
    new Set(((options?.company_industry ?? []).filter(Boolean) as string[]))
  ).map((value) => value.toLowerCase().trim());
  const contactJobTitle = ((icp.job_titles ?? []).filter(Boolean) as string[]).length
    ? ((icp.job_titles ?? []).filter(Boolean) as string[])
    : undefined;
  const overrideJobTitles = Array.from(
    new Set(((options?.contact_job_title ?? []).filter(Boolean) as string[]))
  );
  const overrideSize = Array.from(
    new Set(((options?.size ?? []).filter(Boolean) as string[]))
  );

  const payload: LegacyActorInputPreview = {
    fetch_count: Math.max(1, Math.round(fetchCount || 100)),
    file_name: "Prospects",
    email_status: normalizedEmailStatuses.length
      ? normalizedEmailStatuses
      : ["validated"],
    company_domain: normalizedDomains.length ? normalizedDomains : undefined,
    company_industry: overrideIndustry.length
      ? overrideIndustry
      : companyIndustry.length
        ? companyIndustry
        : undefined,
    company_keywords: overrideKeywords.length
      ? expandCompanyKeywords(overrideKeywords)
      : companyKeywords.length
        ? companyKeywords
        : undefined,
    contact_job_title: overrideJobTitles.length
      ? overrideJobTitles
      : contactJobTitle,
    contact_not_city: normalizedExcludeCity.length ? normalizedExcludeCity : undefined,
    contact_not_location: normalizedExcludeLocation.length
      ? normalizedExcludeLocation
      : undefined,
    funding: normalizedFunding.length ? normalizedFunding : undefined,
    size: overrideSize.length ? overrideSize : size.length ? size : undefined,
    ...revenue,
  };

  if (options?.min_revenue?.trim()) payload.min_revenue = options.min_revenue.trim();
  if (options?.max_revenue?.trim()) payload.max_revenue = options.max_revenue.trim();

  if (city) {
    payload.city = city;
    if (normalizedOverrideLocation.length) {
      payload.contact_location = normalizedOverrideLocation;
    }
  } else if (normalizedOverrideLocation.length) {
    payload.contact_location = normalizedOverrideLocation;
  } else {
    payload.contact_location = normalizedLocation;
  }

  return payload;
}
