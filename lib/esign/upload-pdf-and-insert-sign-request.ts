import { createSupabaseServiceClient, supabaseProjectOrigin } from "@/lib/supabase"
import { ESIGN_BUCKET_ORIGINALS } from "@/lib/esign/buckets"

function networkDetail(error: unknown): string {
  const candidates: unknown[] = [error]
  if (error && typeof error === "object" && "originalError" in error) {
    candidates.push((error as { originalError?: unknown }).originalError)
  }
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object" || !("cause" in candidate)) continue
    const cause = (candidate as { cause?: unknown }).cause
    if (!cause || typeof cause !== "object") continue
    const code =
      "code" in cause && typeof (cause as { code?: unknown }).code === "string"
        ? (cause as { code: string }).code
        : ""
    const message = cause instanceof Error ? cause.message : ""
    if (/bearer|eyJ|sb_secret|service_role/i.test(message)) return code
    const detail = [code, message].filter(Boolean).join(" — ").slice(0, 180)
    if (detail) return detail
  }
  return ""
}

function storageError(
  error: { message?: string; originalError?: unknown } | null,
  fallback: string
): Error {
  const detail = networkDetail(error)
  const base = error?.message || fallback
  return new Error(detail ? `${base} (${detail})` : base)
}

/**
 * Envoie le PDF dans le bucket « documents », crée une ligne `sign_requests` (Supabase Sign).
 * Le corps est un Uint8Array : un Buffer Node est parfois traité comme un flux et provoque
 * « fetch failed » avec le fetch natif (Node 22 / Vercel).
 */
export async function uploadPdfAndInsertSignRequest(
  pdfBuffer: Buffer,
  storagePath: string
): Promise<{ id: string }> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    throw new Error("Configuration Supabase incomplète (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
  }

  const origin = supabaseProjectOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (origin) {
    try {
      await fetch(`${origin}/auth/v1/health`, { method: "GET" })
    } catch (error) {
      console.error("[esign] projet Supabase injoignable", networkDetail(error))
      throw new Error(
        "Le service de signature électronique est injoignable. L’adresse du projet Supabase ne répond pas."
      )
    }
  }

  const bytes = Uint8Array.from(pdfBuffer)
  let { error: upError } = await supabase.storage
    .from(ESIGN_BUCKET_ORIGINALS)
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: false })

  if (upError && /fetch failed/i.test(upError.message || "")) {
    const firstError = upError
    const blob = new Blob([bytes], { type: "application/pdf" })
    const retry = await supabase.storage
      .from(ESIGN_BUCKET_ORIGINALS)
      .upload(storagePath, blob, { contentType: "application/pdf", upsert: false })
    upError = retry.error && networkDetail(firstError) && !networkDetail(retry.error) ? firstError : retry.error
  }

  if (upError) {
    throw storageError(upError, "Échec de l’envoi du PDF vers le stockage.")
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
