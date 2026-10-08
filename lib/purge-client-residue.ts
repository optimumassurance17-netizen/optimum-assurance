import { existsSync } from "fs"
import { unlink } from "fs/promises"
import { createMollieClient } from "@mollie/api-client"
import { createSupabaseServiceClient } from "@/lib/supabase"
import {
  GED_SUPABASE_BUCKET,
  getLocalGedPathCandidates,
  isGedDatabaseFile,
  isGedSupabasePath,
} from "@/lib/user-documents"

/** Nettoyage Mollie + fichiers GED après suppression du compte en base. */
export async function purgeClientExternalResidue(params: {
  gedFilepaths: string[]
  mollieCustomerId: string | null
}): Promise<void> {
  if (params.mollieCustomerId) {
    const apiKey = process.env.MOLLIE_API_KEY
    if (apiKey) {
      try {
        const mollie = createMollieClient({ apiKey })
        await mollie.customers.delete(params.mollieCustomerId)
      } catch (error) {
        console.warn("[gestion] Mollie customers.delete après suppression client (non bloquant):", error)
      }
    }
  }

  const supabaseGedPaths = params.gedFilepaths.filter((filepath): filepath is string => isGedSupabasePath(filepath))
  if (supabaseGedPaths.length > 0) {
    const supabase = createSupabaseServiceClient()
    if (supabase) {
      try {
        await supabase.storage.from(GED_SUPABASE_BUCKET).remove(supabaseGedPaths)
      } catch (error) {
        console.warn("[gestion] suppression GED Supabase après delete user:", error)
      }
    }
  }

  for (const filepath of params.gedFilepaths) {
    if (isGedDatabaseFile(filepath) || isGedSupabasePath(filepath)) continue
    const candidates = getLocalGedPathCandidates(filepath)
    try {
      for (const fullPath of candidates) {
        if (existsSync(fullPath)) await unlink(fullPath)
      }
    } catch (error) {
      console.warn("[gestion] suppression fichier GED après delete user:", filepath, error)
    }
  }
}
