import { createSupabaseServiceClient } from "@/lib/supabase"
import { ESIGN_BUCKET_ORIGINALS } from "@/lib/esign/buckets"

/**
 * Envoie le PDF dans le bucket « documents », crée une ligne `sign_requests` (Supabase Sign).
 */
export async function uploadPdfAndInsertSignRequest(
  pdfBuffer: Buffer,
  storagePath: string
): Promise<{ id: string }> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    throw new Error("Configuration Supabase incomplète (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
  }

  const { error: upError } = await supabase.storage
    .from(ESIGN_BUCKET_ORIGINALS)
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: false })

  if (upError) {
    throw new Error(upError.message || "Échec de l’envoi du PDF vers le stockage.")
  }

  const { data: row, error: insError } = await supabase
    .from("sign_requests")
    .insert({ document_storage_path: storagePath })
    .select("id")
    .single()

  if (insError || !row?.id) {
    throw new Error(insError?.message || "Impossible de créer la demande de signature.")
  }

  return { id: row.id as string }
}
