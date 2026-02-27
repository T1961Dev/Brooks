-- Specific industry sub-niche keywords for precise Apify actor targeting.
-- Stored as text[] so the ICP can hold ["CRM Software", "Sales Enablement"] etc.
alter table public.icp_profiles
  add column if not exists industry_keywords text[] default '{}'::text[];
