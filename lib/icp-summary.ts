/** Single-line summary of all active ICP filters for display in lists and cards. */

export type IcpForSummary = {
  name: string;
  client_id: string | null;
  headcount_brackets?: string[] | null;
  headcount_min: number | null;
  headcount_max: number | null;
  revenue_min: number | null;
  revenue_max: number | null;
  job_titles: string[] | null;
  industries: string[] | null;
  industry_keywords?: string[] | null;
  geography: string | null;
  company_type: string | null;
  technologies: string[] | null;
};

function fmtRevenue(n: number): string {
  if (n >= 1e9) return `$${n / 1e9}B`;
  if (n >= 1e6) return `$${n / 1e6}M`;
  if (n >= 1e3) return `$${n / 1e3}K`;
  return `$${n}`;
}

export function formatIcpSummary(
  icp: IcpForSummary,
  clientName?: string | null
): string {
  const parts: string[] = [];
  if (clientName) parts.push(`Client: ${clientName}`);
  if (icp.job_titles?.length) parts.push(`Titles: ${icp.job_titles.join(", ")}`);
  if (icp.industries?.length) parts.push(`Industries: ${icp.industries.join(", ")}`);
  if (icp.industry_keywords?.length) parts.push(`Keywords: ${icp.industry_keywords.join(", ")}`);
  if (icp.headcount_brackets?.length) {
    parts.push(`Headcount: ${icp.headcount_brackets.join(", ")}`);
  } else if (icp.headcount_min != null || icp.headcount_max != null) {
    const min = icp.headcount_min ?? "?";
    const max = icp.headcount_max != null ? (icp.headcount_max >= 5001 ? "5001+" : icp.headcount_max) : "?";
    parts.push(`Headcount: ${min}-${max}`);
  }
  if (icp.revenue_min != null || icp.revenue_max != null) {
    const min = icp.revenue_min != null ? fmtRevenue(icp.revenue_min) : "Any";
    const max = icp.revenue_max != null ? fmtRevenue(icp.revenue_max) : "Any";
    parts.push(`Revenue: ${min} – ${max}`);
  }
  if (icp.geography) parts.push(`Geo: ${icp.geography}`);
  if (icp.company_type) parts.push(`Type: ${icp.company_type}`);
  if (icp.technologies?.length) parts.push(`Tech: ${icp.technologies.join(", ")}`);
  return parts.length ? parts.join(" • ") : "No filters set";
}
