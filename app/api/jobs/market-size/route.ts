import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headcountToSizeFilter } from "@/lib/integrations/apify";

/**
 * Estimate the addressable market size for an ICP.
 *
 * This uses a realistic model based on known B2B market data:
 *   - Geography determines the base business pool
 *   - Industry filters narrow to a fraction of that pool
 *   - Company size filters narrow further
 *   - Job titles multiply by contacts per company
 *
 * Result is an estimate of how many individual leads (people) match.
 */

// Approximate total businesses with online presence per country (in thousands)
const COUNTRY_BUSINESS_POOLS: Record<string, number> = {
  "united states": 33_000,
  "canada": 3_800,
  "united kingdom": 5_500,
  "germany": 3_700,
  "france": 4_200,
  "australia": 2_400,
  "netherlands": 2_100,
  "spain": 3_500,
  "italy": 4_300,
  global: 120_000,
};

// What fraction of all businesses a given ICP industry represents
const INDUSTRY_SHARE: Record<string, number> = {
  "b2b saas": 0.008,
  fintech: 0.003,
  healthcare: 0.06,
  "e-commerce": 0.04,
  "professional services": 0.12,
  manufacturing: 0.05,
  "real estate": 0.04,
  education: 0.03,
  media: 0.015,
  consulting: 0.06,
  insurance: 0.02,
  legal: 0.03,
  construction: 0.08,
  transportation: 0.04,
  retail: 0.08,
  technology: 0.025,
  "marketing agency": 0.012,
  "financial services": 0.04,
  "non-profit": 0.05,
};

// What fraction of businesses fall within each headcount bracket
const SIZE_SHARE: Record<string, number> = {
  "1-10": 0.65,
  "11-20": 0.12,
  "21-50": 0.09,
  "51-100": 0.05,
  "101-200": 0.035,
  "201-500": 0.025,
  "501-1000": 0.012,
  "1001-2000": 0.006,
  "2001-5000": 0.003,
  "5001-10000": 0.0015,
  "10001-20000": 0.0006,
  "20001-50000": 0.0003,
  "50000+": 0.0001,
};

const LEGACY_TO_ACTOR: Record<string, string[]> = {
  "1-10": ["1-10"],
  "11-50": ["11-20", "21-50"],
  "51-200": ["51-100", "101-200"],
  "201-500": ["201-500"],
  "501-1000": ["501-1000"],
  "1001-5000": ["1001-2000", "2001-5000"],
  "5001+": ["5001-10000", "10001-20000", "20001-50000", "50000+"],
};

const REVENUE_SHARE: Record<string, number> = {
  "Under $1M": 0.58,
  "$1M - $10M": 0.28,
  "$10M - $50M": 0.1,
  "$50M - $100M": 0.025,
  "$100M+": 0.015,
};

// Average matching contacts per company for a given number of job titles selected
function contactsPerCompany(titleCount: number, companySize: string[]): number {
  // Tiny companies have fewer people matching any given title
  const avgBracket = companySize.length > 0 ? companySize[0] : "51-100";
  const sizeNum = parseInt(avgBracket.split("-")[0] ?? "50");

  if (sizeNum <= 10) return Math.min(titleCount, 1.2);
  if (sizeNum <= 50) return Math.min(titleCount, 1.8);
  if (sizeNum <= 200) return Math.min(titleCount * 0.7, 3);
  if (sizeNum <= 1000) return Math.min(titleCount * 0.8, 5);
  return Math.min(titleCount * 1.0, 8);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const icpId = request.nextUrl.searchParams.get("icpId");
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!icpId)
    return NextResponse.json({ error: "icpId required" }, { status: 400 });

  let query = supabase
    .from("icp_profiles")
    .select(
      "headcount_brackets, headcount_min, headcount_max, revenue_min, revenue_max, industries, job_titles, geography, company_type, technologies, client_id"
    )
    .eq("id", icpId)
    .eq("user_id", user.id);
  if (clientId) query = query.eq("client_id", clientId);
  const { data: icp } = await query.single();

  if (!icp)
    return NextResponse.json({ error: "ICP not found" }, { status: 404 });

  /* ---- Geography → base pool ---- */
  const geoKey = (icp.geography ?? "global").toLowerCase().trim();
  const basePool =
    (COUNTRY_BUSINESS_POOLS[geoKey] ?? COUNTRY_BUSINESS_POOLS["global"]) *
    1000; // convert from thousands

  /* ---- Industry filter ---- */
  const industries: string[] = icp.industries ?? [];
  let industryFraction = 0;
  if (industries.length === 0) {
    // No industry filter → entire pool
    industryFraction = 1;
  } else {
    for (const ind of industries) {
      const key = ind.toLowerCase().trim();
      industryFraction += INDUSTRY_SHARE[key] ?? 0.02;
    }
  }

  const companiesAfterIndustry = Math.round(basePool * industryFraction);

  /* ---- Company size filter ---- */
  const selectedHeadcountBrackets: string[] = (icp.headcount_brackets ?? []).filter(
    Boolean
  ) as string[];
  const sizeFilter: string[] =
    selectedHeadcountBrackets.length > 0
      ? Array.from(
          new Set(
            selectedHeadcountBrackets.flatMap(
              (b: string) => LEGACY_TO_ACTOR[b] ?? []
            )
          )
        )
      : headcountToSizeFilter(icp.headcount_min ?? null, icp.headcount_max ?? null);

  let sizeFraction = 0;
  if (sizeFilter.length === 0) {
    sizeFraction = 1;
  } else {
    for (const bracket of sizeFilter) {
      sizeFraction += SIZE_SHARE[bracket] ?? 0.01;
    }
  }

  /* ---- Revenue filter ---- */
  let revenueFraction = 1;
  if (icp.revenue_min != null || icp.revenue_max != null) {
    const rMin = icp.revenue_min ?? 0;
    const rMax = icp.revenue_max ?? Infinity;
    const revBrackets = [
      { label: "Under $1M", min: 0, max: 1_000_000 },
      { label: "$1M - $10M", min: 1_000_000, max: 10_000_000 },
      { label: "$10M - $50M", min: 10_000_000, max: 50_000_000 },
      { label: "$50M - $100M", min: 50_000_000, max: 100_000_000 },
      { label: "$100M+", min: 100_000_000, max: Infinity },
    ];
    revenueFraction = revBrackets
      .filter((b) => b.min < rMax && b.max > rMin)
      .reduce((sum, b) => sum + (REVENUE_SHARE[b.label] ?? 0.02), 0);
    if (revenueFraction === 0) revenueFraction = 0.1;
  }

  const matchingCompanies = Math.round(
    companiesAfterIndustry * sizeFraction * revenueFraction
  );

  /* ---- Job titles → contacts per company ---- */
  const titleCount = (icp.job_titles ?? []).length || 1;
  const cpc = contactsPerCompany(titleCount, sizeFilter);
  const totalContacts = Math.round(matchingCompanies * cpc);

  // Apify's database has roughly 40-60% coverage of real businesses
  const apifyCoverage = 0.45;
  // Email validation pass rate is ~60-80%
  const validEmailRate = 0.65;

  const estimate = Math.round(totalContacts * apifyCoverage * validEmailRate);

  // No artificial floor — if the estimate is 12, show 12
  const finalEstimate = Math.max(0, estimate);

  console.log("[MarketSize]", {
    geography: geoKey,
    basePool,
    industries,
    industryFraction,
    companiesAfterIndustry,
    sizeFilter,
    sizeFraction,
    revenueRange: `${icp.revenue_min ?? "any"}-${icp.revenue_max ?? "any"}`,
    revenueFraction,
    matchingCompanies,
    titleCount,
    contactsPerCompany: cpc,
    totalContacts,
    estimate: finalEstimate,
  });

  return NextResponse.json({
    estimate: finalEstimate,
    breakdown: {
      geography: icp.geography ?? "Global",
      matchingCompanies,
      contactsPerCompany: Math.round(cpc * 10) / 10,
      totalContacts,
      withValidEmail: finalEstimate,
    },
  });
}
