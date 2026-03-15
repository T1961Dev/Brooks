import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildLegacyActorInput,
  headcountToActorSize,
  revenueToActorFilter,
} from "@/lib/integrations/apify-mapping";

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
  "b2b saas": 0.018,
  fintech: 0.007,
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
  "1-10": 0.33,
  "11-20": 0.11,
  "21-50": 0.1,
  "51-100": 0.06,
  "101-200": 0.025,
  "201 - 500": 0.025,
  "201-500": 0.018,
  "501-1000": 0.012,
  "1001-2000": 0.006,
  "2001-5000": 0.003,
  "5001-10000": 0.0015,
  "10001-20000": 0.0009,
  "20001-50000": 0.0004,
  "50000+": 0.0002,
};

const REVENUE_SHARE: Record<string, number> = {
  "Under $1M": 0.58,
  "$1M - $10M": 0.28,
  "$10M - $50M": 0.1,
  "$50M - $100M": 0.025,
  "$100M+": 0.015,
};

const LEGACY_REVENUE_SHARE: Record<string, number> = {
  "100K": 0.7,
  "250K": 0.62,
  "500K": 0.58,
  "1M": 0.45,
  "2M": 0.35,
  "5M": 0.24,
  "10M": 0.15,
  "20M": 0.09,
  "50M": 0.04,
  "100M": 0.02,
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

function keywordShare(keywordCount: number): number {
  if (keywordCount <= 0) return 1;
  // Keywords should narrow, but not collapse the estimate unrealistically.
  return Math.max(0.22, Math.min(0.9, 0.55 + keywordCount * 0.06));
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
      "headcount_brackets, headcount_min, headcount_max, revenue_min, revenue_max, industries, industry_keywords, job_titles, geography, company_type, technologies, client_id"
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
  const industryKeywords: string[] = icp.industry_keywords ?? [];
  const actorInput = buildLegacyActorInput(icp, 1000);
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
  industryFraction = Math.min(
    1,
    industryFraction * keywordShare(industryKeywords.length)
  );

  const companiesAfterIndustry = Math.round(basePool * industryFraction);

  /* ---- Company size filter ---- */
  const sizeFilter: string[] =
    actorInput.size ??
    headcountToActorSize(icp.headcount_min ?? null, icp.headcount_max ?? null);

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
    const revenueFilter = revenueToActorFilter(icp.revenue_min ?? null, icp.revenue_max ?? null);
    if (revenueFilter.min_revenue && revenueFilter.max_revenue) {
      const minShare = LEGACY_REVENUE_SHARE[revenueFilter.min_revenue] ?? 0.2;
      const maxShare = LEGACY_REVENUE_SHARE[revenueFilter.max_revenue] ?? minShare;
      revenueFraction = Math.min(minShare, maxShare) * 0.95;
    } else if (revenueFilter.min_revenue) {
      revenueFraction = LEGACY_REVENUE_SHARE[revenueFilter.min_revenue] ?? 0.2;
    } else if (revenueFilter.max_revenue) {
      revenueFraction = LEGACY_REVENUE_SHARE[revenueFilter.max_revenue] ?? 0.6;
    }
    revenueFraction = Math.max(revenueFraction, 0.08);
  }

  const matchingCompanies = Math.round(
    companiesAfterIndustry * sizeFraction * revenueFraction
  );

  /* ---- Job titles → contacts per company ---- */
  const titleCount = (icp.job_titles ?? []).length || 1;
  const cpc = contactsPerCompany(titleCount, sizeFilter);
  const totalContacts = Math.round(matchingCompanies * cpc);

  const actorCoverage = 0.75;
  const verifiedEmailRate = 0.82;
  const reachableContacts = Math.round(totalContacts * actorCoverage);
  const verifiedContacts = Math.round(reachableContacts * verifiedEmailRate);

  // Market size should reflect total addressable contacts for planning.
  const finalEstimate = Math.max(0, totalContacts);

  console.log("[MarketSize]", {
    geography: geoKey,
    basePool,
    industries,
    industryFraction,
    companiesAfterIndustry,
    sizeFilter,
    sizeFraction,
    industryKeywords,
    actorInput,
    revenueRange: `${icp.revenue_min ?? "any"}-${icp.revenue_max ?? "any"}`,
    revenueFraction,
    matchingCompanies,
    titleCount,
    contactsPerCompany: cpc,
    totalContacts,
    reachableContacts,
    verifiedContacts,
    estimate: finalEstimate,
  });

  return NextResponse.json({
    estimate: finalEstimate,
    breakdown: {
      geography: icp.geography ?? "Global",
      matchingCompanies,
      contactsPerCompany: Math.round(cpc * 10) / 10,
      totalContacts,
      reachableContacts,
      verifiedContacts,
      actorFilters: actorInput,
      withValidEmail: verifiedContacts,
    },
  });
}
