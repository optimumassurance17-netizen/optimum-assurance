import { createSupabaseServiceClient } from "@/lib/supabase"
import { GED_MAX_FILE_BYTES, isOwnedGedObjectPath } from "@/lib/ged-policy"
import {
  gedUploadSecret,
  issueGedUploadReceipt,
  readGedUploadReceipt,
  type GedUploadReceipt,
} from "@/lib/ged-upload-receipt"
import { inspectGedObject, listGedUploadBuckets, persistGedFileRecord } from "@/lib/ged-save"
import { buildGedStoragePath, detectUploadMimeAndExt, sanitizeFilenameBase } from "@/lib/user-documents"

export type GedDirectFailure = { ok: false; error: string; status: number }

export type GedDirectPrepared = { ok: true; signedUrl: string; token: string; receipt: string }

export type GedDirectStored = {
  ok: true
  doc: { id: string; type: string; filename: string; createdAt: Date }
  receipt: GedUploadReceipt
}

function failure(status: number, error: string): GedDirectFailure {
  return { ok: false, status, error }
}

export function peekGedUploadReceipt(token: unknown): GedUploadReceipt | null {
  if (typeof token !== "string" || !token.trim()) return null
  const secret = gedUploadSecret()
  if (!secret) return null
  return readGedUploadReceipt(token.trim(), secret)
}

export async function prepareGedDirectUpload(input: {
  userId: string
  type: string
  filename: string
  mimeType?: string
  size: number
}): Promise<GedDirectPrepared | GedDirectFailure> {
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > GED_MAX_FILE_BYTES) {
    return failure(400, "Le fichier doit faire au plus 10 Mo.")
  }
  const filename = input.filename.trim()
  if (!filename || filename.length > 180) {
    return failure(400, "Nom de fichier invalide.")
  }
  const detected = detectUploadMimeAndExt({ type: input.mimeType, name: filename })
  if (!detected) {
    return failure(400, "Format non autorisé (PDF, JPEG, PNG, WebP uniquement).")
  }
  if (!isOwnedGedObjectPath(input.userId, `ged/${input.userId}/${input.type}/fichier.${detected.extension}`)) {
    return failure(400, "Type de document invalide.")
  }
  const secret = gedUploadSecret()
  if (!secret) return failure(503, "Dépôt temporairement indisponible.")

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return failure(
      503,
      "Ce fichier dépasse la taille envoyée par le site et le stockage distant est indisponible. Déposez un fichier de moins de 4 Mo, ou réessayez plus tard."
    )
  }
  const buckets = await listGedUploadBuckets(supabase)
  const bucket = buckets[0]
  if (!bucket) {
    return failure(503, "Stockage GED indisponible.")
  }
  const storagePath = buildGedStoragePath(
    input.userId,
    input.type,
    Date.now(),
    sanitizeFilenameBase(filename),
    detected.extension
  )
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(storagePath, { upsert: true })
  if (error || !data?.signedUrl || !data.token) {
    return failure(503, "Le stockage n'a pas pu préparer le dépôt. Réessayez.")
  }
  const receipt = issueGedUploadReceipt(
    {
      userId: input.userId,
      type: input.type,
      bucket,
      storagePath,
      size: input.size,
      mimeType: detected.mimeType,
      filename,
    },
    secret
  )
  return { ok: true, signedUrl: data.signedUrl, token: data.token, receipt }
}

export async function finalizeGedDirectUpload(
  userId: string,
  token: string
): Promise<GedDirectStored | GedDirectFailure> {
  const secret = gedUploadSecret()
  if (!secret) return failure(503, "Dépôt temporairement indisponible.")
  const receipt = readGedUploadReceipt(token, secret)
  if (!receipt || receipt.userId !== userId) {
    return failure(400, "Ce dépôt a expiré. Choisissez à nouveau le fichier.")
  }
  if (!isOwnedGedObjectPath(userId, receipt.storagePath)) {
    return failure(400, "Chemin de fichier refusé.")
  }
  const inspected = await inspectGedObject(receipt.bucket, receipt.storagePath)
  if (!inspected.exists) {
    return failure(409, "Le fichier n'est pas encore arrivé dans le stockage. Réessayez.")
  }
  if (inspected.size != null && inspected.size > GED_MAX_FILE_BYTES) {
    return failure(400, "Le fichier dépasse 10 Mo.")
  }
  const storedSize = inspected.size && inspected.size > 0 ? inspected.size : receipt.size
  const doc = await persistGedFileRecord({
    userId,
    type: receipt.type,
    filename: receipt.filename,
    filepath: `${receipt.bucket}/${receipt.storagePath}`,
    mimeType: receipt.mimeType,
    size: storedSize,
  })
  return { ok: true, doc, receipt }
}
