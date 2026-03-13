import { join } from "path"
import { mkdir } from "fs/promises"
import { UPLOAD_DOC_TYPES, UPLOAD_DOC_LABELS } from "./user-document-types"

export const UPLOAD_DIR = join(process.cwd(), "uploads")
export const ALLOWED_TYPES = UPLOAD_DOC_TYPES
export const TYPE_LABELS = UPLOAD_DOC_LABELS

export const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

export async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true })
}
