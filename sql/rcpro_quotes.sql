create table if not exists public.rcpro_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  activity text not null,
  revenue numeric not null,
  employees int not null,
  price numeric not null,
  status text not null check (status in ('draft', 'active', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists rcpro_quotes_user_id_created_at_idx
  on public.rcpro_quotes (user_id, created_at desc);
