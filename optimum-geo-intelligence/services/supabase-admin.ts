import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { AppError } from "@/optimum-geo-intelligence/server/security"

let singleton: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (singleton) return singleton
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !key) {
    throw new AppError("Configuration Supabase incomplète", 503, "SUPABASE_CONFIG_MISSING")
  }
  singleton = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return singleton
}
