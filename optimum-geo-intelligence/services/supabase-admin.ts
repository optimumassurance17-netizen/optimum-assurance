import type { SupabaseClient } from "@supabase/supabase-js"
import { AppError } from "@/optimum-geo-intelligence/server/security"
import { createSupabaseServiceClient } from "@/lib/supabase"

let singleton: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (singleton) return singleton
  const client = createSupabaseServiceClient()
  if (!client) {
    throw new AppError("Configuration Supabase incomplète", 503, "SUPABASE_CONFIG_MISSING")
  }
  singleton = client
  return singleton
}
