import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Client Supabase (anon) pour usage futur (Storage, Realtime, etc.).
 * La base applicative reste gérée par Prisma via DATABASE_URL (PostgreSQL Supabase ou autre).
 * Retourne null si NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY sont absents.
 */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim() || !key?.trim()) return null
  return createClient(url, key)
}

/**
 * Client service role (scripts serveur, imports bulk). Ne jamais exposer au navigateur.
 * Requiert SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
