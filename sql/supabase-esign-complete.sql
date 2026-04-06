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
