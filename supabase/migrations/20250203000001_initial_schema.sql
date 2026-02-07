-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  full_name text,
  company_name text,
  onboarding_completed boolean default false
);

-- onboarding_steps: step_key is unique per user
create table if not exists public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  step_key text not null,
  data jsonb default '{}'::jsonb,
  completed boolean default false,
  completed_at timestamptz,
  unique (user_id, step_key)
);

-- agent_runs
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  agent_type text not null check (agent_type in ('icp', 'offer')),
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  current_step text,
  progress int default 0,
  logs jsonb default '[]'::jsonb,
  output jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  title text,
  company text,
  domain text,
  linkedin_url text,
  location text,
  source jsonb,
  created_at timestamptz default now(),
  unique (user_id, email)
);

-- campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  instantly_campaign_id text,
  name text,
  status text,
  sequence jsonb,
  created_at timestamptz default now()
);

-- apify_runs
create table if not exists public.apify_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  apify_run_id text,
  apify_dataset_id text,
  status text,
  input jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.onboarding_steps enable row level security;
alter table public.agent_runs enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.apify_runs enable row level security;

-- policies: users only access their own rows
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "onboarding_steps_all_own" on public.onboarding_steps for all using (auth.uid() = user_id);

create policy "agent_runs_all_own" on public.agent_runs for all using (auth.uid() = user_id);

create policy "leads_all_own" on public.leads for all using (auth.uid() = user_id);

create policy "campaigns_all_own" on public.campaigns for all using (auth.uid() = user_id);

create policy "apify_runs_all_own" on public.apify_runs for all using (auth.uid() = user_id);
