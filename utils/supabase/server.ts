import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/utils/supabase/env"

/**
 * Client Supabase serveur (cookies, session Auth rafraîchie par le middleware).
 * Retourne null si URL / clé anon absents.
 */
export async function createClient() {
  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseAnonKey()
  if (!supabaseUrl || !supabaseKey) return null

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Appel depuis un Server Component : le middleware rafraîchit la session.
        }
      },
    },
  })
}
