import { existsSync } from "fs"
import { basename, isAbsolute, join } from "path"
import { mkdir } from "fs/promises"
import { UPLOAD_DOC_TYPES, UPLOAD_DOC_LABELS } from "./user-document-types"

export const UPLOAD_DIR = join(process.env.TMPDIR || "/tmp", "optimum-assurance-uploads")
export const ALLOWED_TYPES = UPLOAD_DOC_TYPES
export const TYPE_LABELS = UPLOAD_DOC_LABELS
export const GED_SUPABASE_BUCKET = process.env.SUPABASE_GED_BUCKET?.trim() || "client_documents"
export const GED_SUPABASE_PATH_PREFIX = "ged"
export type GedSupabaseObjectCandidate = { bucket: string; path: string }

export const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

export async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true })
}

export function sanitizeFilenameBase(filename: string): string {
  const dot = filename.lastIndexOf(".")
  const base = dot > 0 ? filename.slice(0, dot) : filename
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
  return cleaned || "document"
}

export function detectUploadMimeAndExt(file: File): { mimeType: string; extension: string } | null {
  const normalizedMime = (file.type || "").trim().toLowerCase()
  if (normalizedMime && ALLOWED_MIMES.includes(normalizedMime)) {
    const ext = MIME_TO_EXT[normalizedMime]
    if (!ext) return null
    return { mimeType: normalizedMime, extension: ext }
  }

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()?.trim().toLowerCase() || ""
    : ""
  if (!ext) return null

  const mappedMime = EXT_TO_MIME[ext]
  if (!mappedMime) return null
  return {
    mimeType: mappedMime,
    extension: ext === "jpeg" ? "jpg" : ext,
  }
}

export function buildGedStoragePath(
  userId: string,
  type: string,
  timestamp: number,
  safeBaseName: string,
  extension: string
): string {
  return `${GED_SUPABASE_PATH_PREFIX}/${userId}/${type}/${timestamp}_${safeBaseName}.${extension}`
}

/**
 * Normalise les anciens formats de chemin stockés en base vers la clé objet Supabase.
 * Exemples gérés: "ged/..", "/ged/..", "client_documents/ged/..", URL publique Supabase.
 */
export function normalizeGedSupabaseObjectPath(filepath: string): string | null {
  const raw = filepath.trim()
  if (!raw) return null

  const maybeDecode = (value: string) => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  const decoded = maybeDecode(raw)
  const normalized = decoded.replace(/\\/g, "/").replace(/^\/+/, "")

  if (normalized.startsWith(`${GED_SUPABASE_PATH_PREFIX}/`)) return normalized

  const bucketPrefixed = `${GED_SUPABASE_BUCKET}/${GED_SUPABASE_PATH_PREFIX}/`
  if (normalized.startsWith(bucketPrefixed)) {
    return normalized.slice(GED_SUPABASE_BUCKET.length + 1)
  }

  const bucketMarker = `/${GED_SUPABASE_BUCKET}/`
  const bucketIdx = normalized.indexOf(bucketMarker)
  if (bucketIdx >= 0) {
    const afterBucket = normalized.slice(bucketIdx + bucketMarker.length)
    if (afterBucket.startsWith(`${GED_SUPABASE_PATH_PREFIX}/`)) return afterBucket
  }

  // Fallback legacy: URL/chemin contenant ".../ged/..."
  const gedIdx = normalized.lastIndexOf(`${GED_SUPABASE_PATH_PREFIX}/`)
  if (gedIdx >= 0) {
    return normalized.slice(gedIdx)
  }

  return null
}

export function resolveGedSupabaseObjectCandidates(filepath: string): GedSupabaseObjectCandidate[] {
  const raw = filepath.trim()
  if (!raw) return []

  const maybeDecode = (value: string) => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  const pushCandidate = (
    out: GedSupabaseObjectCandidate[],
    seen: Set<string>,
    bucket: string,
    objectPath: string
  ) => {
    const cleanBucket = bucket.trim()
    const cleanPath = objectPath
      .trim()
      .replace(/^\/+/, "")
      .replace(/[?#].*$/, "")
    if (!cleanBucket || !cleanPath.startsWith(`${GED_SUPABASE_PATH_PREFIX}/`)) return
    const key = `${cleanBucket}::${cleanPath}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ bucket: cleanBucket, path: cleanPath })
  }

  const out: GedSupabaseObjectCandidate[] = []
  const seen = new Set<string>()

  const normalizedPath = normalizeGedSupabaseObjectPath(raw)
  if (normalizedPath) {
    pushCandidate(out, seen, GED_SUPABASE_BUCKET, normalizedPath)
  }

  const normalizedRaw = maybeDecode(raw).replace(/\\/g, "/").replace(/^\/+/, "")
  const bucketPrefixed = normalizedRaw.match(/^([^/]+)\/(ged\/.+)$/)
  if (bucketPrefixed) {
    pushCandidate(out, seen, bucketPrefixed[1], bucketPrefixed[2])
  }

  if (/^https?:\/\//i.test(raw.trim())) {
    try {
      const parsed = new URL(raw.trim())
      const pathname = maybeDecode(parsed.pathname).replace(/\\/g, "/")
      const storageMatch = pathname.match(
        /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(ged\/.+)$/
      )
      if (storageMatch) {
        pushCandidate(out, seen, storageMatch[1], storageMatch[2])
      }
    } catch {
      // ignore malformed legacy URL
    }
  }

  return out
}

/**
 * Génère les chemins locaux candidats pour compatibilité avec anciens formats.
 */
export function getLocalGedPathCandidates(filepath: string): string[] {
  const raw = filepath.trim()
  if (!raw) return []

  const normalized = raw.replace(/\\/g, "/")
  const candidates = new Set<string>()

  if (isAbsolute(normalized)) {
    candidates.add(normalized)
  }

  candidates.add(join(UPLOAD_DIR, normalized.replace(/^\/+/, "")))
  candidates.add(join(UPLOAD_DIR, basename(normalized)))

  return [...candidates]
}

export function isGedSupabasePath(filepath: string | null | undefined): boolean {
  if (!filepath) return false
  return resolveGedSupabaseObjectCandidates(filepath).length > 0
}

export function isSupabaseGedPath(filepath: string | null | undefined): boolean {
  return isGedSupabasePath(filepath)
}

export function isLikelySupabaseGedPath(filepath: string | null | undefined): boolean {
  return isGedSupabasePath(filepath)
}

export function resolveGedFileReadTarget(
  filepath: string
): { kind: "supabase"; candidates: GedSupabaseObjectCandidate[] } | { kind: "local"; path: string } {
  const supabaseCandidates = resolveGedSupabaseObjectCandidates(filepath)
  if (supabaseCandidates.length > 0) {
    return { kind: "supabase", candidates: supabaseCandidates }
  }

  const localCandidates = getLocalGedPathCandidates(filepath)
  const existingLocalPath = localCandidates.find((candidate) => existsSync(candidate))
  if (existingLocalPath) {
    return { kind: "local", path: existingLocalPath }
  }

  return {
    kind: "local",
    path: localCandidates[0] ?? join(UPLOAD_DIR, filepath.replace(/^\/+/, "")),
  }
}

export function resolveGedFileStorageTarget(
  filepath: string
): { kind: "supabase"; candidates: GedSupabaseObjectCandidate[] } | { kind: "local"; paths: string[] } {
  const supabaseCandidates = resolveGedSupabaseObjectCandidates(filepath)
  if (supabaseCandidates.length > 0) {
    return { kind: "supabase", candidates: supabaseCandidates }
  }

  const localCandidates = getLocalGedPathCandidates(filepath)
  return { kind: "local", paths: localCandidates }
}
