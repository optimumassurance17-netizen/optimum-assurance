-- Référence : schéma simplifié demandé pour documentation / SQL Editor Supabase.
-- Source de vérité applicative : Prisma (voir prisma/schema.prisma) + migrations.
-- Si vous hébergez Postgres sur Supabase, utilisez DATABASE_URL dans .env (pas ce DDL seul).

create extension if not exists "uuid-ossp";

create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  contract_number text unique,
  product_type text,
  client_name text,
  siret text,
  address text,
  activities jsonb,
  project_name text,
  project_address text,
  premium numeric,
  status text default 'draft',
  paid_at timestamp,
  created_at timestamp default now()
);

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid,
  mollie_id text,
  status text,
  amount numeric,
  paid_at timestamp
);
