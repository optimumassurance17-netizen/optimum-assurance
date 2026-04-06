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
