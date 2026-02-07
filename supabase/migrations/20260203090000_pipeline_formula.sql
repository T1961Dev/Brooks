-- =============================================================================
-- Pipeline Formula v1 — single consolidated migration
-- Depends on: 20250203000001_initial_schema.sql
--             20250203100000_dashboard_profile_integrations.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CLIENTS (must come first — everything references this)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  industry text,
  website text,
  notes text,
  onboarding_completed boolean default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'clients_all_own' and tablename = 'clients') then
    create policy "clients_all_own" on public.clients for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists clients_user_id_idx on public.clients (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ICP PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.icp_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  name text not null,
  headcount_min int,
  headcount_max int,
  revenue_min int,
  revenue_max int,
  job_titles text[] default '{}',
  industries text[] default '{}',
  geography text,
  company_type text,
  technologies text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If icp_profiles already existed without client_id, add it
alter table public.icp_profiles
  add column if not exists client_id uuid references public.clients (id) on delete set null;

alter table public.icp_profiles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'icp_profiles_all_own' and tablename = 'icp_profiles') then
    create policy "icp_profiles_all_own" on public.icp_profiles for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists icp_profiles_user_id_idx on public.icp_profiles (user_id);
create index if not exists icp_profiles_client_id_idx on public.icp_profiles (client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LEAD JOBS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.lead_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  icp_id uuid references public.icp_profiles (id) on delete set null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  batch_size int default 100,
  source text default 'apify',
  apify_run_id text,
  apify_dataset_id text,
  instantly_list_id text,
  instantly_list_name text,
  instantly_campaign_id text,
  requested_lead_count int,
  actual_lead_count int,
  verification_breakdown jsonb default '{}'::jsonb,
  market_size_estimate int,
  progress_step text,
  progress_percent int default 0,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If lead_jobs already existed, add missing columns
alter table public.lead_jobs
  add column if not exists client_id uuid references public.clients (id) on delete set null,
  add column if not exists instantly_campaign_id text,
  add column if not exists requested_lead_count int,
  add column if not exists actual_lead_count int,
  add column if not exists verification_breakdown jsonb default '{}'::jsonb,
  add column if not exists market_size_estimate int;

alter table public.lead_jobs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'lead_jobs_all_own' and tablename = 'lead_jobs') then
    create policy "lead_jobs_all_own" on public.lead_jobs for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists lead_jobs_user_id_idx on public.lead_jobs (user_id);
create index if not exists lead_jobs_icp_id_idx on public.lead_jobs (icp_id);
create index if not exists lead_jobs_client_id_idx on public.lead_jobs (client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LEAD JOB STEPS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.lead_job_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.lead_jobs (id) on delete cascade,
  step text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  logs jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Ensure the step check allows all pipeline steps
alter table public.lead_job_steps drop constraint if exists lead_job_steps_step_check;
alter table public.lead_job_steps add constraint lead_job_steps_step_check check (
  step in ('scrape', 'verify', 'verify_mx', 'verify_smtp', 'dedupe', 'classify', 'enrich', 'store', 'notify', 'export')
);

alter table public.lead_job_steps enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'lead_job_steps_all_own' and tablename = 'lead_job_steps') then
    create policy "lead_job_steps_all_own" on public.lead_job_steps for all using (
      auth.uid() = (select user_id from public.lead_jobs where id = job_id)
    );
  end if;
end $$;
create index if not exists lead_job_steps_job_id_idx on public.lead_job_steps (job_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. LEAD VERIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.lead_verifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  job_id uuid not null references public.lead_jobs (id) on delete cascade,
  status text not null check (status in ('valid', 'catch_all', 'invalid', 'risky')),
  mx_valid boolean,
  smtp_valid boolean,
  provider text default 'internal',
  logs jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.lead_verifications enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'lead_verifications_all_own' and tablename = 'lead_verifications') then
    create policy "lead_verifications_all_own" on public.lead_verifications for all using (
      auth.uid() = (select user_id from public.lead_jobs where id = job_id)
    );
  end if;
end $$;
create index if not exists lead_verifications_job_id_idx on public.lead_verifications (job_id);
create index if not exists lead_verifications_lead_id_idx on public.lead_verifications (lead_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. LEAD EXPORTS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.lead_exports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.lead_jobs (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  leads_sent int default 0,
  success boolean default false,
  error text,
  instantly_campaign_id text,
  instantly_list_id text,
  created_at timestamptz default now()
);

-- If lead_exports already existed, add client_id
alter table public.lead_exports
  add column if not exists client_id uuid references public.clients (id) on delete set null;

alter table public.lead_exports enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'lead_exports_all_own' and tablename = 'lead_exports') then
    create policy "lead_exports_all_own" on public.lead_exports for all using (
      auth.uid() = (select user_id from public.lead_jobs where id = job_id)
    );
  end if;
end $$;
create index if not exists lead_exports_job_id_idx on public.lead_exports (job_id);
create index if not exists lead_exports_client_id_idx on public.lead_exports (client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. EXTEND EXISTING LEADS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.leads
  add column if not exists client_id uuid references public.clients (id) on delete set null,
  add column if not exists job_id uuid references public.lead_jobs (id) on delete set null,
  add column if not exists icp_id uuid references public.icp_profiles (id) on delete set null,
  add column if not exists verification_status text,
  add column if not exists enriched jsonb default '{}'::jsonb,
  add column if not exists export_status text,
  add column if not exists email_normalized text,
  add column if not exists domain_normalized text;

create index if not exists leads_job_id_idx on public.leads (job_id);
create index if not exists leads_icp_id_idx on public.leads (icp_id);
create index if not exists leads_client_id_idx on public.leads (client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. EXTEND CAMPAIGNS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.campaigns
  add column if not exists client_id uuid references public.clients (id) on delete set null;
create index if not exists campaigns_client_id_idx on public.campaigns (client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. PER-CLIENT INSTANTLY INTEGRATION
-- ─────────────────────────────────────────────────────────────────────────────
-- Add client_id to user_integrations
alter table public.user_integrations
  add column if not exists client_id uuid references public.clients (id) on delete cascade;

-- Drop the original unique constraint so we can support per-client rows
alter table public.user_integrations
  drop constraint if exists user_integrations_user_id_provider_key;

-- One row per (user_id, provider) when client_id IS NULL (agency default)
create unique index if not exists user_integrations_agency_unique
  on public.user_integrations (user_id, provider) where client_id is null;

-- One row per (user_id, provider, client_id) when client_id IS NOT NULL
create unique index if not exists user_integrations_client_unique
  on public.user_integrations (user_id, provider, client_id) where client_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. CLIENT COLD EMAILS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.client_cold_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, client_id)
);

alter table public.client_cold_emails enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'client_cold_emails_all_own' and tablename = 'client_cold_emails') then
    create policy "client_cold_emails_all_own" on public.client_cold_emails for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists client_cold_emails_client_id_idx on public.client_cold_emails (client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. CLIENT ONBOARDING TOKENS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.client_onboarding_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table public.client_onboarding_tokens enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'client_onboarding_tokens_all_own' and tablename = 'client_onboarding_tokens') then
    create policy "client_onboarding_tokens_all_own" on public.client_onboarding_tokens for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists client_onboarding_tokens_client_id_idx on public.client_onboarding_tokens (client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. CLIENT OFFERS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.client_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, client_id)
);

alter table public.client_offers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'client_offers_all_own' and tablename = 'client_offers') then
    create policy "client_offers_all_own" on public.client_offers for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists client_offers_client_id_idx on public.client_offers (client_id);
