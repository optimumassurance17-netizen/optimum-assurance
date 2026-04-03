import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Client Supabase pour le serveur (build ISR, routes, sitemap).
 * Préfère SUPABASE_SERVICE_ROLE_KEY pour contourner la RLS en écriture future ;
 * en lecture, la clé anon suffit si les politiques « select public » sont actives.
 */
export function createSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
