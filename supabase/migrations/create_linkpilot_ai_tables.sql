-- Optimum LinkPilot AI
-- Tables + index + RLS + triggers

create extension if not exists pgcrypto;

create or replace function public.linkpilot_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.backlink_prospects (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  url text not null,
  contact_email text,
  contact_name text,
  category text not null default 'autre',
  niche text,
  country text not null default 'France',
  domain_authority integer not null default 0 check (domain_authority >= 0 and domain_authority <= 100),
  estimated_traffic integer not null default 0 check (estimated_traffic >= 0),
  spam_score integer not null default 0 check (spam_score >= 0 and spam_score <= 100),
  relevance_score integer not null default 0 check (relevance_score >= 0 and relevance_score <= 100),
  backlink_score integer not null default 0 check (backlink_score >= 0 and backlink_score <= 100),
  status text not null default 'new' check (status in ('new', 'qualified', 'contacted', 'replied', 'accepted', 'rejected', 'acquired')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_category text,
  email_subject text,
  email_body text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sent_outreach_emails (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.backlink_prospects(id) on delete set null,
  campaign_id uuid references public.outreach_campaigns(id) on delete set null,
  recipient_email text,
  subject text,
  body text,
  status text not null default 'draft' check (status in ('draft', 'ready_for_review', 'approved', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.acquired_backlinks (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.backlink_prospects(id) on delete set null,
  source_url text not null,
  target_url text not null,
  anchor_text text,
  link_type text not null default 'dofollow' check (link_type in ('dofollow', 'nofollow', 'sponsored', 'ugc')),
  first_seen_at timestamptz,
  last_checked_at timestamptz,
  status text not null default 'active' check (status in ('active', 'lost', 'pending')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.toxic_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  reason text,
  spam_score integer not null default 0 check (spam_score >= 0 and spam_score <= 100),
  created_at timestamptz not null default timezone('utc', now())
);

-- Indexes
create index if not exists idx_backlink_prospects_domain on public.backlink_prospects(domain);
create index if not exists idx_backlink_prospects_status on public.backlink_prospects(status);
create index if not exists idx_backlink_prospects_category on public.backlink_prospects(category);
create index if not exists idx_sent_outreach_emails_campaign_id on public.sent_outreach_emails(campaign_id);
create index if not exists idx_sent_outreach_emails_prospect_id on public.sent_outreach_emails(prospect_id);
create index if not exists idx_acquired_backlinks_status on public.acquired_backlinks(status);
create index if not exists idx_acquired_backlinks_target_url on public.acquired_backlinks(target_url);

-- Triggers updated_at
drop trigger if exists trg_backlink_prospects_updated_at on public.backlink_prospects;
create trigger trg_backlink_prospects_updated_at
before update on public.backlink_prospects
for each row execute function public.linkpilot_set_updated_at();

drop trigger if exists trg_outreach_campaigns_updated_at on public.outreach_campaigns;
create trigger trg_outreach_campaigns_updated_at
before update on public.outreach_campaigns
for each row execute function public.linkpilot_set_updated_at();

-- RLS
alter table public.backlink_prospects enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.sent_outreach_emails enable row level security;
alter table public.acquired_backlinks enable row level security;
alter table public.toxic_domains enable row level security;

drop policy if exists backlink_prospects_read on public.backlink_prospects;
create policy backlink_prospects_read on public.backlink_prospects
for select using (auth.role() = 'authenticated');

drop policy if exists backlink_prospects_write on public.backlink_prospects;
create policy backlink_prospects_write on public.backlink_prospects
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists outreach_campaigns_read on public.outreach_campaigns;
create policy outreach_campaigns_read on public.outreach_campaigns
for select using (auth.role() = 'authenticated');

drop policy if exists outreach_campaigns_write on public.outreach_campaigns;
create policy outreach_campaigns_write on public.outreach_campaigns
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists sent_outreach_emails_read on public.sent_outreach_emails;
create policy sent_outreach_emails_read on public.sent_outreach_emails
for select using (auth.role() = 'authenticated');

drop policy if exists sent_outreach_emails_write on public.sent_outreach_emails;
create policy sent_outreach_emails_write on public.sent_outreach_emails
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists acquired_backlinks_read on public.acquired_backlinks;
create policy acquired_backlinks_read on public.acquired_backlinks
for select using (auth.role() = 'authenticated');

drop policy if exists acquired_backlinks_write on public.acquired_backlinks;
create policy acquired_backlinks_write on public.acquired_backlinks
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists toxic_domains_read on public.toxic_domains;
create policy toxic_domains_read on public.toxic_domains
for select using (auth.role() = 'authenticated');

drop policy if exists toxic_domains_write on public.toxic_domains;
create policy toxic_domains_write on public.toxic_domains
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
