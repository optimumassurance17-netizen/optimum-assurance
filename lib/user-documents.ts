import { join } from "path"
import { mkdir } from "fs/promises"
import { UPLOAD_DOC_TYPES, UPLOAD_DOC_LABELS } from "./user-document-types"

export const UPLOAD_DIR = join(process.env.TMPDIR || "/tmp", "optimum-assurance-uploads")
export const ALLOWED_TYPES = UPLOAD_DOC_TYPES
export const TYPE_LABELS = UPLOAD_DOC_LABELS
export const GED_SUPABASE_BUCKET = process.env.SUPABASE_GED_BUCKET?.trim() || "client_documents"
export const GED_SUPABASE_PATH_PREFIX = "ged"

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
