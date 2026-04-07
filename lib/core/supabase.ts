import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseBrowserClient, createSupabaseServiceClient } from "@/lib/supabase"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export function getCoreSupabaseBrowserClient(): SupabaseClient | null {
  return createSupabaseBrowserClient()
}

export function getCoreSupabaseServerClient(): SupabaseClient | null {
  return createSupabaseServerClient()
}

export function getCoreSupabaseServiceClient(): SupabaseClient | null {
  return createSupabaseServiceClient()
}

export function requireCoreSupabaseServiceClient(): SupabaseClient {
  const client = getCoreSupabaseServiceClient()
  if (!client) {
    throw new Error("Supabase service indisponible (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).")
  }
  return client
}

/** Point d’entrée principal côté serveur pour les modules métier. */
export function createCoreSupabaseClient(): SupabaseClient {
  return requireCoreSupabaseServiceClient()
}
