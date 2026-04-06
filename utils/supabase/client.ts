import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/utils/supabase/env"

/**
 * Client Supabase navigateur (Auth + cookies gérés par @supabase/ssr).
 * Retourne null si URL / clé anon absents.
 */
export function createClient() {
  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseAnonKey()
  if (!supabaseUrl || !supabaseKey) return null
  return createBrowserClient(supabaseUrl, supabaseKey)
}
