-- OPTIMUM GEO INTELLIGENCE
-- Migration complète: tables, index, RLS, seeds

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domain text not null unique,
  is_active boolean not null default true,
  priority integer not null default 50,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.competitor_pages (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  url text not null,
  title text not null default '',
  meta_description text not null default '',
  h1 text not null default '',
  h2 text[] not null default '{}',
  faq text[] not null default '{}',
  schema_json text[] not null default '{}',
  body_hash text not null,
  seo_score numeric(5,2) not null default 0,
  is_new boolean not null default false,
  changed_fields text[] not null default '{}',
  crawled_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.geo_queries (
  id uuid primary key default gen_random_uuid(),
  query text not null unique,
  intent text not null default 'transactionnel',
  is_active boolean not null default true,
  priority integer not null default 50,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.geo_results (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.geo_queries(id) on delete cascade,
  provider text not null check (provider in ('chatgpt', 'gemini', 'claude', 'perplexity')),
  response_text text not null,
  brand_mentions integer not null default 0,
  competitor_mentions integer not null default 0,
  total_tokens integer not null default 0,
  visibility_ratio numeric(8,6) not null default 0,
  geo_score numeric(5,2) not null default 0,
  captured_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.geo_scores (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('global', 'page', 'city', 'profession')),
  scope_key text not null,
  score numeric(5,2) not null default 0,
  details jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  title text not null default '',
  h1 text not null default '',
  word_count integer not null default 0,
  has_faq boolean not null default false,
  has_schema boolean not null default false,
  body_hash text not null default '',
  duplicate_of text,
  recommendation_json jsonb not null default '{}'::jsonb,
  status text not null default 'needs_review' check (status in ('needs_review', 'approved', 'rejected', 'applied')),
  scanned_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.seo_scores (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  score numeric(5,2) not null default 0,
  details jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('article', 'faq', 'guide', 'metier', 'local-city', 'local-metier-city')),
  keyword text not null,
  city_name text,
  profession_name text,
  title text not null,
  slug text not null,
  path text not null unique,
  seo_title text not null,
  meta_description text not null,
  h1 text not null,
  body_json jsonb not null default '[]'::jsonb,
  faq_json jsonb not null default '[]'::jsonb,
  faq_schema_json text not null default '',
  json_ld text not null default '',
  internal_links text[] not null default '{}',
  cta_label text not null default 'Obtenir un devis',
  cta_href text not null default '/devis',
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'archived')),
  generated_by text not null default 'openai',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.content_history (
  id uuid primary key default gen_random_uuid(),
  generated_content_id uuid not null references public.generated_content(id) on delete cascade,
  change_type text not null check (change_type in ('created', 'updated', 'approved', 'published', 'archived')),
  old_payload jsonb not null default '{}'::jsonb,
  new_payload jsonb not null default '{}'::jsonb,
  actor text not null default 'system',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.professions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  message text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references public.alerts(id) on delete set null,
  channel text not null check (channel in ('email', 'dashboard', 'internal')),
  status text not null check (status in ('queued', 'sent', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crawl_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  target text not null,
  status text not null check (status in ('success', 'warning', 'error')),
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  status text not null check (status in ('success', 'warning', 'error')),
  title text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  geo_score numeric(5,2) not null default 0,
  seo_score numeric(5,2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Index
create index if not exists idx_competitor_pages_competitor_crawled on public.competitor_pages(competitor_id, crawled_at desc);
create index if not exists idx_competitor_pages_url on public.competitor_pages(url);
create index if not exists idx_geo_results_query_provider on public.geo_results(query_id, provider, captured_at desc);
create index if not exists idx_geo_scores_scope on public.geo_scores(scope_type, scope_key, measured_at desc);
create index if not exists idx_seo_scores_path on public.seo_scores(path, measured_at desc);
create index if not exists idx_generated_content_type_status on public.generated_content(content_type, status, created_at desc);
create index if not exists idx_alerts_status_created on public.alerts(status, created_at desc);
create index if not exists idx_notifications_alert on public.notifications(alert_id, created_at desc);
create index if not exists idx_crawl_logs_source_created on public.crawl_logs(source, created_at desc);
create index if not exists idx_ai_reports_type_created on public.ai_reports(report_type, created_at desc);

-- Trigger updated_at
drop trigger if exists trg_competitors_updated_at on public.competitors;
create trigger trg_competitors_updated_at
before update on public.competitors
for each row execute function public.set_updated_at();

drop trigger if exists trg_geo_queries_updated_at on public.geo_queries;
create trigger trg_geo_queries_updated_at
before update on public.geo_queries
for each row execute function public.set_updated_at();

drop trigger if exists trg_seo_pages_updated_at on public.seo_pages;
create trigger trg_seo_pages_updated_at
before update on public.seo_pages
for each row execute function public.set_updated_at();

drop trigger if exists trg_generated_content_updated_at on public.generated_content;
create trigger trg_generated_content_updated_at
before update on public.generated_content
for each row execute function public.set_updated_at();

drop trigger if exists trg_cities_updated_at on public.cities;
create trigger trg_cities_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

drop trigger if exists trg_professions_updated_at on public.professions;
create trigger trg_professions_updated_at
before update on public.professions
for each row execute function public.set_updated_at();

drop trigger if exists trg_alerts_updated_at on public.alerts;
create trigger trg_alerts_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

-- RLS
alter table public.competitors enable row level security;
alter table public.competitor_pages enable row level security;
alter table public.geo_queries enable row level security;
alter table public.geo_results enable row level security;
alter table public.geo_scores enable row level security;
alter table public.seo_pages enable row level security;
alter table public.seo_scores enable row level security;
alter table public.generated_content enable row level security;
alter table public.content_history enable row level security;
alter table public.cities enable row level security;
alter table public.professions enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.crawl_logs enable row level security;
alter table public.ai_reports enable row level security;
alter table public.daily_snapshots enable row level security;

drop policy if exists competitors_read on public.competitors;
create policy competitors_read on public.competitors for select using (auth.role() = 'authenticated');
drop policy if exists competitors_write on public.competitors;
create policy competitors_write on public.competitors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists competitor_pages_read on public.competitor_pages;
create policy competitor_pages_read on public.competitor_pages for select using (auth.role() = 'authenticated');
drop policy if exists competitor_pages_write on public.competitor_pages;
create policy competitor_pages_write on public.competitor_pages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists geo_queries_read on public.geo_queries;
create policy geo_queries_read on public.geo_queries for select using (auth.role() = 'authenticated');
drop policy if exists geo_queries_write on public.geo_queries;
create policy geo_queries_write on public.geo_queries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists geo_results_read on public.geo_results;
create policy geo_results_read on public.geo_results for select using (auth.role() = 'authenticated');
drop policy if exists geo_results_write on public.geo_results;
create policy geo_results_write on public.geo_results for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists geo_scores_read on public.geo_scores;
create policy geo_scores_read on public.geo_scores for select using (auth.role() = 'authenticated');
drop policy if exists geo_scores_write on public.geo_scores;
create policy geo_scores_write on public.geo_scores for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists seo_pages_read on public.seo_pages;
create policy seo_pages_read on public.seo_pages for select using (auth.role() = 'authenticated');
drop policy if exists seo_pages_write on public.seo_pages;
create policy seo_pages_write on public.seo_pages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists seo_scores_read on public.seo_scores;
create policy seo_scores_read on public.seo_scores for select using (auth.role() = 'authenticated');
drop policy if exists seo_scores_write on public.seo_scores;
create policy seo_scores_write on public.seo_scores for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists generated_content_read on public.generated_content;
create policy generated_content_read on public.generated_content for select using (auth.role() = 'authenticated');
drop policy if exists generated_content_write on public.generated_content;
create policy generated_content_write on public.generated_content for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists content_history_read on public.content_history;
create policy content_history_read on public.content_history for select using (auth.role() = 'authenticated');
drop policy if exists content_history_write on public.content_history;
create policy content_history_write on public.content_history for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists cities_read on public.cities;
create policy cities_read on public.cities for select using (auth.role() = 'authenticated');
drop policy if exists cities_write on public.cities;
create policy cities_write on public.cities for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists professions_read on public.professions;
create policy professions_read on public.professions for select using (auth.role() = 'authenticated');
drop policy if exists professions_write on public.professions;
create policy professions_write on public.professions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists alerts_read on public.alerts;
create policy alerts_read on public.alerts for select using (auth.role() = 'authenticated');
drop policy if exists alerts_write on public.alerts;
create policy alerts_write on public.alerts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select using (auth.role() = 'authenticated');
drop policy if exists notifications_write on public.notifications;
create policy notifications_write on public.notifications for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists crawl_logs_read on public.crawl_logs;
create policy crawl_logs_read on public.crawl_logs for select using (auth.role() = 'authenticated');
drop policy if exists crawl_logs_write on public.crawl_logs;
create policy crawl_logs_write on public.crawl_logs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists ai_reports_read on public.ai_reports;
create policy ai_reports_read on public.ai_reports for select using (auth.role() = 'authenticated');
drop policy if exists ai_reports_write on public.ai_reports;
create policy ai_reports_write on public.ai_reports for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists daily_snapshots_read on public.daily_snapshots;
create policy daily_snapshots_read on public.daily_snapshots for select using (auth.role() = 'authenticated');
drop policy if exists daily_snapshots_write on public.daily_snapshots;
create policy daily_snapshots_write on public.daily_snapshots for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seeds
insert into public.competitors(name, domain, is_active, priority)
values
  ('AXA Construction', 'www.axa.fr', true, 90),
  ('April', 'www.april.fr', true, 85),
  ('SMA BTP', 'www.smabtp.fr', true, 95),
  ('Entoria', 'www.entoria.com', true, 75),
  ('QBE', 'www.qbeeurope.com', true, 70),
  ('Verspieren', 'www.verspieren.com', true, 80)
on conflict (name) do update set domain = excluded.domain, is_active = excluded.is_active;

insert into public.geo_queries(query, intent, is_active, priority)
values
  ('meilleure assurance décennale', 'transactionnel', true, 100),
  ('assurance décennale artisan', 'transactionnel', true, 95),
  ('assurance décennale auto entrepreneur', 'transactionnel', true, 90),
  ('assurance décennale bâtiment', 'informationnel', true, 85),
  ('courtier assurance décennale', 'navigationnel', true, 80),
  ('assurance décennale pas chère', 'transactionnel', true, 98)
on conflict (query) do nothing;

insert into public.cities(name, slug, is_active)
values
  ('Paris', 'paris', true),
  ('Marseille', 'marseille', true),
  ('Lyon', 'lyon', true),
  ('Toulouse', 'toulouse', true),
  ('Bordeaux', 'bordeaux', true),
  ('Nantes', 'nantes', true),
  ('Lille', 'lille', true),
  ('Strasbourg', 'strasbourg', true),
  ('Nice', 'nice', true),
  ('Montpellier', 'montpellier', true)
on conflict (slug) do nothing;

insert into public.professions(name, slug, is_active)
values
  ('plombier', 'plombier', true),
  ('électricien', 'electricien', true),
  ('maçon', 'macon', true),
  ('couvreur', 'couvreur', true),
  ('carreleur', 'carreleur', true),
  ('peintre', 'peintre', true),
  ('menuisier', 'menuisier', true),
  ('chauffagiste', 'chauffagiste', true),
  ('artisan BTP', 'artisan-btp', true)
on conflict (slug) do nothing;
