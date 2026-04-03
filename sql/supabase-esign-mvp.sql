-- MVP signature électronique : exécuter dans l’éditeur SQL Supabase.
-- Ensuite exécuter supabase-esign-storage.sql (création des buckets Storage).

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

-- Pas de policy : accès anon refusé. L’API Next.js utilise SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
--
-- Exemple après upload du fichier dans le bucket "documents" :
-- insert into public.sign_requests (document_storage_path) values ('dossiers/contrat.pdf');
