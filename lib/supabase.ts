import { setDefaultResultOrder } from "node:dns"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/utils/supabase/env"

let ipv4Preferred = false

/** Undici/Vercel tente parfois l’IPv6 en premier et renvoie « fetch failed ». */
function preferIpv4Lookup() {
  if (ipv4Preferred) return
  ipv4Preferred = true
  try {
    setDefaultResultOrder("ipv4first")
  } catch {
    /* runtime sans setDefaultResultOrder */
  }
}

/** Origine du projet, sans chemin (`/rest/v1` casserait l’URL Storage). */
export function supabaseProjectOrigin(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed).origin
  } catch {
    return null
  }
}

/**
 * Client Supabase (anon) pour usage futur (Storage, Realtime, etc.).
 * La base applicative reste gérée par Prisma via DATABASE_URL (PostgreSQL Supabase ou autre).
 * Retourne null si URL / clé anon absents (NEXT_PUBLIC_SUPABASE_ANON_KEY ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY).
 */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Client service role (scripts serveur, imports bulk). Ne jamais exposer au navigateur.
 * Requiert SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const url = supabaseProjectOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  preferIpv4Lookup()
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
