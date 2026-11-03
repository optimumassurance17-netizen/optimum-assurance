import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseServiceClient } from "@/lib/supabase"

let cachedClient: SupabaseClient | null = null

/**
 * Client service role pour LinkPilot.
 * Réutilise le client qui préfère l’IPv4 : sur Vercel, l’IPv6 de Supabase
 * répond souvent par « TypeError: fetch failed ».
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient
  const client = createSupabaseServiceClient()
  if (!client) {
    throw new Error("Supabase admin non configuré (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
  }
  cachedClient = client
  return cachedClient
}
