import { existsSync } from "fs"
import { unlink } from "fs/promises"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import {
  GED_SUPABASE_BUCKET,
  buildGedStoragePath,
  encodeGedDatabaseFile,
  resolveGedFileStorageTarget,
  sanitizeFilenameBase,
} from "@/lib/user-documents"

const GED_BUCKET_CANDIDATES = [
  GED_SUPABASE_BUCKET,
  "client_documents",
  "documents",
  "client-documents",
  "user_documents",
  "uploads",
]

type StorageClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>

export async function listGedUploadBuckets(supabase: StorageClient): Promise<string[]> {
  const defaults = [...new Set(GED_BUCKET_CANDIDATES.map((bucket) => bucket.trim()).filter(Boolean))]
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error || !data) return defaults
    const available = new Set(
      data.map((bucket) => bucket?.name?.trim()).filter((name): name is string => Boolean(name))
    )
    const presentDefaults = defaults.filter((name) => available.has(name))
    if (presentDefaults.length > 0) return presentDefaults
    return [...available]
  } catch {
    return defaults
  }
}

export async function uploadGedObject(
  bytes: Buffer,
  storagePath: string,
  mimeType: string
): Promise<{ bucket: string; storagePath: string } | null> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) return null
  const buckets = await listGedUploadBuckets(supabase)
  for (const bucket of buckets) {
    try {
      const { error } = await supabase.storage.from(bucket).upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: true,
      })
      if (!error) return { bucket, storagePath }
    } catch {
      // bucket suivant
    }
  }
  return null
}

async function removeStoredGedFile(filepath: string) {
  const storageTarget = resolveGedFileStorageTarget(filepath)
  if (storageTarget.kind === "supabase") {
    const supabase = createSupabaseServiceClient()
    if (!supabase) return
    try {
      const byBucket = new Map<string, string[]>()
      for (const candidate of storageTarget.candidates) {
        const list = byBucket.get(candidate.bucket) ?? []
        list.push(candidate.path)
        byBucket.set(candidate.bucket, list)
      }
      for (const [bucket, paths] of byBucket.entries()) {
        await supabase.storage.from(bucket).remove(paths)
      }
    } catch {
      // Suppression best-effort
    }
    return
  }
  if (storageTarget.kind === "local") {
    for (const fullPath of storageTarget.paths) {
      if (existsSync(fullPath)) {
        await unlink(fullPath).catch(() => {})
      }
    }
  }
}

export async function persistGedFileRecord(input: {
  userId: string
  type: string
  filename: string
  filepath: string
  mimeType: string
  size: number
}): Promise<{ id: string; type: string; filename: string; createdAt: Date }> {
  const existing = await prisma.userDocument.findUnique({
    where: { userId_type: { userId: input.userId, type: input.type } },
    select: { filepath: true },
  })
  if (existing && existing.filepath !== input.filepath) {
    await removeStoredGedFile(existing.filepath)
  }
  const depositedAt = new Date()
  return prisma.userDocument.upsert({
    where: { userId_type: { userId: input.userId, type: input.type } },
    create: {
      userId: input.userId,
      type: input.type,
      filename: input.filename,
      filepath: input.filepath,
      mimeType: input.mimeType,
      size: input.size,
      createdAt: depositedAt,
    },
    update: {
      filename: input.filename,
      filepath: input.filepath,
      mimeType: input.mimeType,
      size: input.size,
      createdAt: depositedAt,
    },
    select: { id: true, type: true, filename: true, createdAt: true },
  })
}

export async function saveGedDocumentForUser(input: {
  userId: string
  type: string
  filename: string
  bytes: Buffer
  mimeType: string
  extension: string
}): Promise<{ id: string; filename: string; createdAt: Date }> {
  const safeBaseName = sanitizeFilenameBase(input.filename)
  const storagePath = buildGedStoragePath(input.userId, input.type, Date.now(), safeBaseName, input.extension)
  const uploaded = await uploadGedObject(input.bytes, storagePath, input.mimeType)
  const persistedPath = uploaded
    ? `${uploaded.bucket}/${uploaded.storagePath}`
    : encodeGedDatabaseFile(input.bytes)
  const doc = await persistGedFileRecord({
    userId: input.userId,
    type: input.type,
    filename: input.filename,
    filepath: persistedPath,
    mimeType: input.mimeType,
    size: input.bytes.length,
  })
  return doc
}

export async function inspectGedObject(
  bucket: string,
  storagePath: string
): Promise<{ exists: boolean; size: number | null }> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) return { exists: false, size: null }
  const slash = storagePath.lastIndexOf("/")
  const folder = slash >= 0 ? storagePath.slice(0, slash) : ""
  const name = slash >= 0 ? storagePath.slice(slash + 1) : storagePath
  try {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { search: name, limit: 20 })
    const entry = !error ? data?.find((row) => row.name === name) : undefined
    if (entry) {
      const rawSize = entry.metadata && typeof entry.metadata === "object" ? entry.metadata.size : undefined
      const numericSize = typeof rawSize === "number" ? rawSize : typeof rawSize === "string" ? Number(rawSize) : Number.NaN
      return { exists: true, size: Number.isFinite(numericSize) ? numericSize : null }
    }
  } catch {
    // La liste peut échouer juste après l'envoi : on confirme par téléchargement.
  }
  try {
    const { data, error } = await supabase.storage.from(bucket).download(storagePath)
    if (error || !data) return { exists: false, size: null }
    return { exists: true, size: data.size }
  } catch {
    return { exists: false, size: null }
  }
}
