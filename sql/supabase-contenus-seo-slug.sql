-- Colonne slug sur contenus_seo (unicité pour upserts idempotents du script bulk SEO)
-- À exécuter une fois sur Supabase avant `npm run seo:bulk`.

alter table public.contenus_seo add column if not exists slug text;

create unique index if not exists contenus_seo_slug_unique
  on public.contenus_seo (slug)
  where slug is not null;

comment on column public.contenus_seo.slug is 'Identifiant stable de page SEO (ex. decennale-local:macon:paris)';
