import type { ApifyDatasetItem } from "@/lib/integrations/apify";

export interface EnrichedLead {
  linkedin_url?: string | null;
  company_size?: string | null;
  tech_stack?: string[] | null;
  location?: string | null;
  revenue_estimate?: string | null;
  website?: string | null;
}

export function enrichFromApify(item: ApifyDatasetItem): EnrichedLead {
  const techStack =
    (Array.isArray((item as { techStack?: unknown }).techStack)
      ? ((item as { techStack?: string[] }).techStack ?? [])
      : (item as { tech?: string[] }).tech ?? []) || [];

  return {
    linkedin_url: (item.linkedInUrl ?? item.linkedin_url)?.toString?.() ?? null,
    company_size: (item.companySize ?? item.company_size)?.toString?.() ?? null,
    tech_stack: techStack.length ? techStack.map((t) => t.toString()) : null,
    location: (item.location ?? item.city)?.toString?.() ?? null,
    revenue_estimate: (item.revenue ?? item.revenueEstimate)?.toString?.() ?? null,
    website: (item.website ?? item.domain)?.toString?.() ?? null,
  };
}
