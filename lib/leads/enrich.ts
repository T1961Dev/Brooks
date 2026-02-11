import type { ApifyDatasetItem } from "@/lib/integrations/apify";

/**
 * All enrichment data we can extract from an Apify lead record.
 * Stored as JSON in leads.enriched column.
 */
export interface EnrichedLead {
  linkedin_url?: string | null;
  company_linkedin?: string | null;
  company_size?: number | null;
  company_annual_revenue?: string | null;
  company_annual_revenue_clean?: string | null;
  company_total_funding?: string | null;
  company_total_funding_clean?: string | null;
  company_description?: string | null;
  company_technologies?: string | null;
  company_founded_year?: string | null;
  company_phone?: string | null;
  company_full_address?: string | null;
  company_postal_code?: string | null;
  company_domain?: string | null;
  headline?: string | null;
  seniority_level?: string | null;
  functional_level?: string | null;
  mobile_number?: string | null;
  keywords?: string | null;
  location?: string | null;
  website?: string | null;
}

/**
 * Map fields from the raw Apify dataset item into our enriched lead structure.
 */
export function enrichFromApify(item: ApifyDatasetItem): EnrichedLead {
  const city = item.city ?? item.company_city ?? null;
  const state = item.state ?? item.company_state ?? null;
  const country = item.country ?? item.company_country ?? null;
  const locationParts = [city, state, country].filter(Boolean);

  return {
    linkedin_url: item.linkedin ?? null,
    company_linkedin: item.company_linkedin ?? null,
    company_size: item.company_size ?? null,
    company_annual_revenue: item.company_annual_revenue ?? null,
    company_annual_revenue_clean: item.company_annual_revenue_clean ?? null,
    company_total_funding: item.company_total_funding ?? null,
    company_total_funding_clean: item.company_total_funding_clean ?? null,
    company_description: item.company_description ?? null,
    company_technologies: item.company_technologies ?? null,
    company_founded_year: item.company_founded_year ?? null,
    company_phone: item.company_phone ?? null,
    company_full_address: item.company_full_address ?? null,
    company_postal_code: item.company_postal_code ?? null,
    company_domain: item.company_domain ?? null,
    headline: item.headline ?? null,
    seniority_level: item.seniority_level ?? null,
    functional_level: item.functional_level ?? null,
    mobile_number: item.mobile_number ?? null,
    keywords: item.keywords ?? null,
    location: locationParts.length > 0 ? locationParts.join(", ") : null,
    website: item.company_website ?? null,
  };
}
