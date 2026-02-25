/** Structured options for ICP filters (Apollo / LinkedIn style). No free text where these apply. */

export const ICP_JOB_TITLES = [
  "CEO", "CFO", "COO", "CTO", "CMO", "VP Sales", "VP Marketing", "VP Engineering",
  "Head of Sales", "Head of Marketing", "Head of Growth", "Head of Revenue",
  "Director of Sales", "Director of Marketing", "Director of Business Development",
  "Sales Manager", "Marketing Manager", "Account Executive", "Business Development Manager",
  "Revenue Operations", "Demand Generation", "Product Manager", "Founder", "Owner",
] as const;

export const ICP_INDUSTRIES = [
  "B2B SaaS", "Fintech", "Healthcare", "E-commerce", "Professional Services",
  "Manufacturing", "Real Estate", "Education", "Media", "Consulting",
  "Insurance", "Legal", "Construction", "Transportation", "Retail",
  "Technology", "Marketing Agency", "Financial Services", "Non-profit",
] as const;

export const HEADCOUNT_BRACKETS = [
  { label: "1-10", min: 1, max: 10 },
  { label: "11-50", min: 11, max: 50 },
  { label: "51-200", min: 51, max: 200 },
  { label: "201-500", min: 201, max: 500 },
  { label: "501-1000", min: 501, max: 1000 },
  { label: "1001-5000", min: 1001, max: 5000 },
  { label: "5001+", min: 5001, max: null },
] as const;

export const REVENUE_BRACKETS = [
  { label: "Under $1M", min: 0, max: 1_000_000 },
  { label: "$1M - $10M", min: 1_000_000, max: 10_000_000 },
  { label: "$10M - $50M", min: 10_000_000, max: 50_000_000 },
  { label: "$50M - $100M", min: 50_000_000, max: 100_000_000 },
  { label: "$100M+", min: 100_000_000, max: null },
] as const;

export const REVENUE_THRESHOLDS = [
  { label: "$0", value: 0 },
  { label: "$1M", value: 1_000_000 },
  { label: "$10M", value: 10_000_000 },
  { label: "$50M", value: 50_000_000 },
  { label: "$100M", value: 100_000_000 },
] as const;

export const GEOGRAPHY_OPTIONS = [
  "United States", "Canada", "United Kingdom", "Germany", "France",
  "Australia", "Netherlands", "Spain", "Italy", "Global",
] as const;

export const COMPANY_TYPES = [
  "B2B", "B2C", "SaaS", "Agency", "Enterprise", "SMB", "Startup",
] as const;

export const TECH_OPTIONS = [
  "HubSpot", "Salesforce", "Outreach", "Apollo", "LinkedIn Sales Navigator",
  "ZoomInfo", "Marketo", "Pardot", "Google Workspace", "Microsoft 365",
] as const;
