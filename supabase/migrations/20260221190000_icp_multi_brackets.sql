-- Support multi-select headcount/revenue brackets on ICPs
alter table public.icp_profiles
  add column if not exists headcount_brackets text[] default '{}'::text[],
  add column if not exists revenue_brackets text[] default '{}'::text[];

