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

/**
 * Sub-niches for each top-level industry. These become the actual
 * `company_keywords` sent to the Apify actor — much more specific than
 * the parent industry name (e.g. "CRM software" vs "B2B SaaS").
 */
export const INDUSTRY_SUB_NICHES: Record<string, readonly string[]> = {
  "B2B SaaS": [
    "CRM Software", "HR Software / HRIS", "Project Management Software",
    "Cybersecurity Platform", "Marketing Automation", "Sales Enablement",
    "Accounting Software", "Customer Support Software", "Analytics / BI Platform",
    "DevOps / Developer Tools", "Supply Chain Software", "ERP Software",
    "Communication / Collaboration", "E-learning Platform", "Compliance Software",
    "Data Integration", "Cloud Infrastructure", "Workflow Automation",
    "Recruiting Software / ATS", "Vertical SaaS",
  ],
  Fintech: [
    "Payments / Payment Processing", "Lending Platform", "Insurtech",
    "Regtech / Compliance", "Wealth Management", "Crypto / Blockchain",
    "Banking Software", "Financial Planning", "Invoice / Billing Platform",
    "Expense Management", "Neobank", "Trading Platform",
  ],
  Healthcare: [
    "Healthtech / Digital Health", "Telemedicine", "Medical Devices",
    "Pharma", "Biotech", "Health Insurance", "Mental Health Platform",
    "EHR / EMR Systems", "Clinical Trials", "Wellness Platform",
    "Home Health", "Health Analytics",
  ],
  "E-commerce": [
    "Online Retail", "Marketplace", "D2C Brand", "Subscription Commerce",
    "Social Commerce", "Fulfillment / Logistics", "E-commerce Platform",
    "Dropshipping", "Fashion / Apparel E-commerce", "Food / Grocery Delivery",
  ],
  "Professional Services": [
    "Management Consulting", "Accounting Firm", "Law Firm",
    "Staffing / Recruiting Agency", "Engineering Consulting",
    "IT Consulting", "Strategy Consulting", "Outsourcing / BPO",
  ],
  Manufacturing: [
    "Industrial Manufacturing", "Automotive", "Aerospace",
    "Electronics Manufacturing", "Food Manufacturing", "Chemical Manufacturing",
    "3D Printing / Additive", "Packaging", "Textile Manufacturing",
  ],
  "Real Estate": [
    "Commercial Real Estate", "Residential Real Estate", "PropTech",
    "Real Estate Investment / REIT", "Property Management",
    "Real Estate Brokerage", "Construction Development",
  ],
  Education: [
    "EdTech", "Online Learning Platform", "K-12", "Higher Education",
    "Corporate Training", "Language Learning", "Test Prep",
    "LMS Platform", "Tutoring",
  ],
  Media: [
    "Digital Media", "Publishing", "Streaming", "Podcast",
    "Content Production", "News Media", "Gaming", "Film / Video",
  ],
  Consulting: [
    "Management Consulting", "IT Consulting", "Strategy Consulting",
    "HR Consulting", "Marketing Consulting", "Financial Consulting",
    "Operations Consulting", "Digital Transformation",
  ],
  Insurance: [
    "Insurtech", "Life Insurance", "Health Insurance",
    "Commercial Insurance", "Reinsurance", "Insurance Brokerage",
  ],
  Legal: [
    "Legal Tech", "Law Firm", "Corporate Legal", "IP Law",
    "Compliance / Regulatory", "Legal Services",
  ],
  Construction: [
    "Construction Technology", "General Contracting", "Architecture",
    "Civil Engineering", "Building Materials", "MEP Engineering",
  ],
  Transportation: [
    "Logistics / Freight", "Fleet Management", "Last-mile Delivery",
    "Ride-sharing", "Shipping / Maritime", "Autonomous Vehicles",
    "Supply Chain Management",
  ],
  Retail: [
    "Brick-and-mortar Retail", "Grocery", "Fashion / Apparel",
    "Consumer Electronics", "Luxury Goods", "Convenience Stores",
    "Retail Technology",
  ],
  Technology: [
    "Cloud Computing", "AI / Machine Learning", "IoT",
    "Blockchain", "AR / VR", "Robotics", "Semiconductor",
    "Data Infrastructure", "Edge Computing", "Quantum Computing",
  ],
  "Marketing Agency": [
    "Digital Marketing Agency", "SEO Agency", "PPC Agency",
    "Social Media Agency", "Content Agency", "PR Agency",
    "Branding Agency", "Performance Marketing", "Creative Agency",
  ],
  "Financial Services": [
    "Investment Banking", "Asset Management", "Private Equity",
    "Venture Capital", "Commercial Banking", "Financial Advisory",
    "Hedge Fund", "Credit Union",
  ],
  "Non-profit": [
    "Charitable Foundation", "NGO", "Social Enterprise",
    "Environmental Non-profit", "Education Non-profit",
    "Healthcare Non-profit", "Advocacy / Policy",
  ],
};

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
