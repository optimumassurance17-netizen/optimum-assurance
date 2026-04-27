import type { PendingSignature } from "@/lib/prisma-client"
import { logAdminActivity } from "@/lib/admin-activity"
import { ESIGN_BUCKET_ORIGINALS, ESIGN_BUCKET_SIGNED } from "@/lib/esign/buckets"
import { applyPendingFinalize } from "@/lib/pending-signature-finalize"
import { createSupabaseServiceClient } from "@/lib/supabase"

function normalizeStoragePath(path: string): string {
  return decodeURIComponent(path).replace(/^\/+/, "").trim()
}

function extractBucketPathFromUrl(url: string, bucket: string): string | null {
  const raw = url.trim()
  if (!raw) return null
  const plainBucketPrefix = `${bucket}/`
  if (raw.startsWith(plainBucketPrefix)) {
    return normalizeStoragePath(raw.slice(plainBucketPrefix.length))
  }
  const directBucket = raw.indexOf(`/${bucket}/`)
  if (directBucket >= 0) {
    const segment = raw.slice(directBucket + bucket.length + 2).split("?")[0]
    return normalizeStoragePath(segment)
  }
  const objectPrefix = `/object/public/${bucket}/`
  const objectSignedPrefix = `/object/sign/${bucket}/`
  const objectAuthPrefix = `/object/authenticated/${bucket}/`
  for (const prefix of [objectPrefix, objectSignedPrefix, objectAuthPrefix]) {
    const idx = raw.indexOf(prefix)
    if (idx >= 0) {
      const segment = raw.slice(idx + prefix.length).split("?")[0]
      return normalizeStoragePath(segment)
    }
  }
  return null
}

function extractSignedKey(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  const marker = `/${ESIGN_BUCKET_SIGNED}/`
  const idx = raw.indexOf(marker)
  if (idx >= 0) {
    const key = raw.slice(idx + marker.length).split("?")[0].trim()
    return key ? decodeURIComponent(key) : null
  }
  const bucketPath = extractBucketPathFromUrl(raw, ESIGN_BUCKET_SIGNED)
  if (bucketPath) return bucketPath
  if (!raw.includes("://") && !raw.startsWith("/")) {
    return decodeURIComponent(raw.replace(/^signed_documents\//, "").trim())
  }
  return null
}

export type PendingSignatureRepairResult =
  | { repaired: true; signedQuoteStorageKey: string }
  | {
      repaired: false
      reason: string
      status: number
      code: "config" | "supabase_read" | "missing_request" | "signed_not_found" | "invalid_signed_url"
    }

export async function repairPendingSignature(
  pending: PendingSignature,
  actorEmail: string,
  opts?: { action?: string }
): Promise<PendingSignatureRepairResult> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return {
      repaired: false,
      reason: "Configuration Supabase incomplète (clé service).",
      status: 503,
      code: "config",
    }
  }

  const { data: signRequestRow, error: signReqErr } = await supabase
    .from("sign_requests")
    .select("document_storage_path")
    .eq("id", pending.signatureRequestId)
    .maybeSingle()

  if (signReqErr) {
    return {
      repaired: false,
      reason: "Lecture de la demande de signature Supabase impossible.",
      status: 502,
      code: "supabase_read",
    }
  }

  const documentStoragePath = signRequestRow?.document_storage_path as string | undefined
  if (!documentStoragePath || !documentStoragePath.trim()) {
    return {
      repaired: false,
      reason: "Demande de signature introuvable côté Supabase.",
      status: 409,
      code: "missing_request",
    }
  }

  const { data: originalPublic } = supabase.storage
    .from(ESIGN_BUCKET_ORIGINALS)
    .getPublicUrl(documentStoragePath.trim())
  const originalDocumentUrl = originalPublic.publicUrl
  const normalizedOriginalPath = normalizeStoragePath(documentStoragePath)
  const encodedOriginalPath = encodeURIComponent(normalizedOriginalPath).replace(/%2F/g, "/")

  const { data: signedRowsInitial, error: signedErr } = await supabase
    .from("signatures")
    .select("signed_document_url, document_url, created_at")
    .eq("document_url", originalDocumentUrl)
    .order("created_at", { ascending: false })
    .limit(5)
  let signedRows = signedRowsInitial

  if (signedErr) {
    return {
      repaired: false,
      reason: "Lecture des signatures Supabase impossible.",
      status: 502,
      code: "supabase_read",
    }
  }

  if (!signedRows?.length) {
    const { data: fallbackRows, error: fallbackErr } = await supabase
      .from("signatures")
      .select("signed_document_url, document_url, created_at")
      .order("created_at", { ascending: false })
      .limit(400)
    if (fallbackErr) {
      return {
        repaired: false,
        reason: "Lecture des signatures Supabase impossible.",
        status: 502,
        code: "supabase_read",
      }
    }
    signedRows =
      fallbackRows?.filter((row) => {
        const docUrl = typeof row.document_url === "string" ? row.document_url : ""
        if (!docUrl) return false
        const extracted = extractBucketPathFromUrl(docUrl, ESIGN_BUCKET_ORIGINALS)
        if (extracted && extracted === normalizedOriginalPath) return true
        return (
          docUrl.includes(`/${ESIGN_BUCKET_ORIGINALS}/${normalizedOriginalPath}`) ||
          docUrl.includes(`/${ESIGN_BUCKET_ORIGINALS}/${encodedOriginalPath}`)
        )
      }) ?? []
  }

  const signedUrl = signedRows?.[0]?.signed_document_url as string | undefined
  if (!signedUrl || typeof signedUrl !== "string") {
    return {
      repaired: false,
      reason: "Aucune signature finalisée trouvée.",
      status: 409,
      code: "signed_not_found",
    }
  }

  const signedKey = extractSignedKey(signedUrl)
  if (!signedKey) {
    return {
      repaired: false,
      reason: "URL de document signé invalide.",
      status: 422,
      code: "invalid_signed_url",
    }
  }

  await applyPendingFinalize(pending, { signedQuoteStorageKey: signedKey.trim() })

  await logAdminActivity({
    adminEmail: actorEmail,
    action: opts?.action ?? "pending_signature_repaired",
    targetType: "pending_signature",
    targetId: pending.signatureRequestId,
    details: { userId: pending.userId, signedQuoteStorageKey: signedKey.trim() },
  })

  return { repaired: true, signedQuoteStorageKey: signedKey.trim() }
}
