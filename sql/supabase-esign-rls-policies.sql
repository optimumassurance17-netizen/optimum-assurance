-- =============================================================================
-- Politiques RLS pour sign_requests / signatures (advisor Supabase « RLS Enabled No Policy »)
-- À exécuter sur une base où les tables existent déjà (SQL Editor ou : npm run supabase:apply-esign-policies)
-- =============================================================================
-- L’API Next.js utilise SUPABASE_SERVICE_ROLE_KEY : ce rôle contourne la RLS (pas de policy requise).
-- Ces politiques refusent explicitement les rôles PostgREST anon / authenticated (clé publique).
-- =============================================================================

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
