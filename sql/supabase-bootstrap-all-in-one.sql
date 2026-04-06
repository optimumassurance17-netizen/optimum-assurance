-- =============================================================================
-- FICHIER GÉNÉRÉ — ne pas éditer à la main
-- Source : npm run supabase:bundle (scripts/bundle-supabase-sql.mjs)
-- Coller dans Supabase → SQL → New query → Run (une fois par projet, ou après reset)
-- Alternative CLI : npm run supabase:install (même ordre, via Prisma)
-- =============================================================================


-- === PARTIE 1 — Signature + Storage (supabase-esign-complete.sql) ===

-- =============================================================================
-- Signature électronique MVP (Supabase) — À EXÉCUTER EN UNE FOIS
-- Dashboard Supabase → SQL Editor → coller ce fichier → Run
-- =============================================================================
-- Crée : tables sign_requests, signatures + buckets Storage documents / signed_documents
-- Réf. : app/api/sign, app/sign/[id]
-- =============================================================================

-- ----- Partie A : schéma (pgcrypto + tables) -----
create extension if not exists "pgcrypto";

create table if not exists public.sign_requests (
  id uuid primary key default gen_random_uuid(),
  document_storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  document_url text not null,
  signed_document_url text not null,
  email text not null,
  ip text,
  user_agent text,
  document_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists signatures_created_at_idx on public.signatures (created_at desc);

alter table public.sign_requests enable row level security;
alter table public.signatures enable row level security;

-- Politiques explicites (advisor « RLS Enabled No Policy ») : refus anon / authenticated.
-- L’API Next.js utilise SUPABASE_SERVICE_ROLE_KEY — ce rôle contourne la RLS.
-- (Copie alignée sur sql/supabase-esign-rls-policies.sql pour exécutions partielles.)
drop policy if exists "sign_requests_deny_anon" on public.sign_requests;
create policy "sign_requests_deny_anon" on public.sign_requests
  for all to anon
  using (false)
  with check (false);

drop policy if exists "sign_requests_deny_authenticated" on public.sign_requests;
create policy "sign_requests_deny_authenticated" on public.sign_requests
  for all to authenticated
  using (false)
  with check (false);

drop policy if exists "signatures_deny_anon" on public.signatures;
create policy "signatures_deny_anon" on public.signatures
  for all to anon
  using (false)
  with check (false);

drop policy if exists "signatures_deny_authenticated" on public.signatures;
create policy "signatures_deny_authenticated" on public.signatures
  for all to authenticated
  using (false)
  with check (false);

-- ----- Partie B : buckets Storage (PDF, privés, URLs signées côté API) -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 52428800, array['application/pdf']::text[]),
  ('signed_documents', 'signed_documents', false, 52428800, array['application/pdf']::text[])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- === PARTIE 2 — RLS advisor (supabase-rls-utilisateurs-entreprises-devis.sql) ===

-- Activer la RLS sur les tables signalées par Supabase (advisor « RLS Disabled in Public »).
-- À exécuter une fois dans le SQL Editor du projet Supabase (ou via psql sur la même base).
--
-- Comportement :
-- - PostgREST (clés anon / authenticated) : sans politique explicite, aucun accès aux lignes
--   (refus par défaut une fois la RLS activée).
-- - Connexion serveur Prisma (DATABASE_URL utilisateur postgres) : le propriétaire des tables
--   contourne en général la RLS (comportement PostgreSQL par défaut).
-- - Clé service_role Supabase : contourne la RLS (usage serveur uniquement, jamais côté client).
--
-- Si une appli utilisait le client Supabase (anon) sur ces tables, il faudrait ajouter des
-- politiques explicites ; ce dépôt n’interroge pas ces noms de tables en TypeScript.

alter table if exists public.utilisateurs enable row level security;
alter table if exists public.entreprises enable row level security;
alter table if exists public.devis enable row level security;


-- === PARTIE 3 — SEO programmatique (supabase-seo-programmatic.sql) ===

-- SEO programmatique — tables et exemples pour Optimum Assurance
-- À exécuter dans l’éditeur SQL Supabase (ou psql) sur le projet cible.
-- Les politiques RLS permettent la lecture publique des pages publiées.

-- Extensions utiles
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables métier
-- ---------------------------------------------------------------------------

create table if not exists public.metiers (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  slug text not null unique,
  description text,
  risques text,
  prix_moyen numeric(12, 2)
);

create table if not exists public.villes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  slug text not null unique,
  population integer
);

create table if not exists public.types_projets (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  slug text not null unique,
  description text
);

-- Templates ou blocs réutilisables (titres, H1, corps HTML/Markdown léger)
create table if not exists public.contenus_seo (
  id uuid primary key default gen_random_uuid(),
  type_page text not null,
  title text,
  meta_description text,
  h1 text,
  contenu text
);

-- Pages locales publiées : décennale × ville
create table if not exists public.seo_decennale_ville (
  id uuid primary key default gen_random_uuid(),
  metier_id uuid not null references public.metiers (id) on delete cascade,
  ville_id uuid not null references public.villes (id) on delete cascade,
  body_extra text,
  indexable boolean not null default true,
  content_hash text,
  published_at timestamptz default now(),
  unique (metier_id, ville_id)
);

create index if not exists idx_seo_decennale_ville_slugs on public.seo_decennale_ville (metier_id, ville_id);

-- Pages locales publiées : dommage ouvrage (type de projet) × ville
create table if not exists public.seo_do_ville (
  id uuid primary key default gen_random_uuid(),
  type_projet_id uuid not null references public.types_projets (id) on delete cascade,
  ville_id uuid not null references public.villes (id) on delete cascade,
  body_extra text,
  indexable boolean not null default true,
  content_hash text,
  published_at timestamptz default now(),
  unique (type_projet_id, ville_id)
);

create index if not exists idx_seo_do_ville_ids on public.seo_do_ville (type_projet_id, ville_id);

-- ---------------------------------------------------------------------------
-- RLS : lecture anonyme sur les tables de contenu SEO
-- ---------------------------------------------------------------------------

alter table public.metiers enable row level security;
alter table public.villes enable row level security;
alter table public.types_projets enable row level security;
alter table public.contenus_seo enable row level security;
alter table public.seo_decennale_ville enable row level security;
alter table public.seo_do_ville enable row level security;

-- Politiques idempotentes (drop si besoin de ré-exécuter)
drop policy if exists "seo_metiers_select_public" on public.metiers;
create policy "seo_metiers_select_public" on public.metiers for select using (true);

drop policy if exists "seo_villes_select_public" on public.villes;
create policy "seo_villes_select_public" on public.villes for select using (true);

drop policy if exists "seo_types_projets_select_public" on public.types_projets;
create policy "seo_types_projets_select_public" on public.types_projets for select using (true);

drop policy if exists "seo_contenus_seo_select_public" on public.contenus_seo;
create policy "seo_contenus_seo_select_public" on public.contenus_seo for select using (true);

drop policy if exists "seo_decennale_ville_select_public" on public.seo_decennale_ville;
create policy "seo_decennale_ville_select_public" on public.seo_decennale_ville for select using (true);

drop policy if exists "seo_do_ville_select_public" on public.seo_do_ville;
create policy "seo_do_ville_select_public" on public.seo_do_ville for select using (true);

-- ---------------------------------------------------------------------------
-- Données d’exemple (upsert par slug)
-- ---------------------------------------------------------------------------

insert into public.villes (nom, slug, population)
values
  ('Paris', 'paris', 2161000),
  ('Lyon', 'lyon', 522000),
  ('Marseille', 'marseille', 870000)
on conflict (slug) do update set
  nom = excluded.nom,
  population = excluded.population;

insert into public.metiers (nom, slug, description, risques, prix_moyen)
values
  (
    'Maçon',
    'macon',
    'La maçonnerie et le gros œuvre structurent l’ouvrage : fondations, murs porteurs, dalles.',
    'Tassements, fissures structurelles, désordres de gros œuvre.',
    1200.00
  ),
  (
    'Plombier',
    'plombier',
    'La plomberie couvre les réseaux d’eau et d’évacuation sur le chantier.',
    'Fuites, infiltrations, désordres sur réseaux encastrés.',
    950.00
  )
on conflict (slug) do update set
  nom = excluded.nom,
  description = excluded.description,
  risques = excluded.risques,
  prix_moyen = excluded.prix_moyen;

insert into public.types_projets (nom, slug, description)
values
  (
    'Particulier faisant construire',
    'particulier',
    'Maître d’ouvrage particulier pour une maison individuelle ou jumelée.'
  ),
  (
    'Auto-construction',
    'auto-construction',
    'Particulier qui coordonne lui-même le chantier pour son propre compte.'
  )
on conflict (slug) do update set
  nom = excluded.nom,
  description = excluded.description;

insert into public.contenus_seo (type_page, title, meta_description, h1, contenu)
select 'decennale_local', null, null, null,
  'Bloc template : personnalisez les paragraphes par ville (enrichissement automatique côté appli).'
where not exists (select 1 from public.contenus_seo where type_page = 'decennale_local');

insert into public.contenus_seo (type_page, title, meta_description, h1, contenu)
select 'do_local', null, null, null,
  'Bloc template DO : contextualiser l’obligation légale et le périmètre de garantie par ville.'
where not exists (select 1 from public.contenus_seo where type_page = 'do_local');

-- Liaisons exemple : /assurance-decennale/macon/paris , /assurance-decennale/macon/lyon
insert into public.seo_decennale_ville (metier_id, ville_id, body_extra, indexable, content_hash)
select m.id, v.id,
  'À Paris, les chantiers en milieu dense impliquent souvent une coordination renforcée (voisinage, accès, délais). Optimum Assurance accompagne les maçons avec un parcours devis en ligne et une attestation décennale conforme.',
  true,
  encode(sha256(convert_to('decennale|macon|paris|v1', 'utf8')), 'hex')
from public.metiers m
cross join public.villes v
where m.slug = 'macon' and v.slug = 'paris'
on conflict (metier_id, ville_id) do update set
  body_extra = excluded.body_extra,
  indexable = excluded.indexable,
  content_hash = excluded.content_hash;

insert into public.seo_decennale_ville (metier_id, ville_id, body_extra, indexable)
select m.id, v.id,
  'À Lyon et en métropole, la décennale maçon reste obligatoire pour le gros œuvre : attestation à fournir au maître d’ouvrage avant signature.',
  true
from public.metiers m
cross join public.villes v
where m.slug = 'macon' and v.slug = 'lyon'
on conflict (metier_id, ville_id) do nothing;

-- Exemple DO : /dommage-ouvrage/particulier/paris
insert into public.seo_do_ville (type_projet_id, ville_id, body_extra, indexable, content_hash)
select t.id, v.id,
  'À Paris, le coût de construction et les contraintes urbaines influencent le montant de la prime DO. Demandez un devis personnalisé : réponse sous 24h.',
  true,
  encode(sha256(convert_to('do|particulier|paris|v1', 'utf8')), 'hex')
from public.types_projets t
cross join public.villes v
where t.slug = 'particulier' and v.slug = 'paris'
on conflict (type_projet_id, ville_id) do update set
  body_extra = excluded.body_extra,
  indexable = excluded.indexable,
  content_hash = excluded.content_hash;


-- === PARTIE 4 — Colonne slug contenus SEO (supabase-contenus-seo-slug.sql) ===

-- Colonne slug sur contenus_seo (unicité pour upserts idempotents du script bulk SEO)
-- À exécuter une fois sur Supabase avant `npm run seo:bulk`.

alter table public.contenus_seo add column if not exists slug text;

create unique index if not exists contenus_seo_slug_unique
  on public.contenus_seo (slug)
  where slug is not null;

comment on column public.contenus_seo.slug is 'Identifiant stable de page SEO (ex. decennale-local:macon:paris)';

