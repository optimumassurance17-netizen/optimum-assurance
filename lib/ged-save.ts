import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import {
  GED_SUPABASE_BUCKET,
  buildGedStoragePath,
  encodeGedDatabaseFile,
  sanitizeFilenameBase,
} from "@/lib/user-documents"

export async function saveGedDocumentForUser(input: {
  userId: string
  type: string
  filename: string
  bytes: Buffer
  mimeType: string
  extension: string
}): Promise<{ id: string; filename: string; createdAt: Date }> {
  const now = Date.now()
  const safeBaseName = sanitizeFilenameBase(input.filename)
  const storagePath = buildGedStoragePath(input.userId, input.type, now, safeBaseName, input.extension)
  let persistedPath = encodeGedDatabaseFile(input.bytes)
  const supabase = createSupabaseServiceClient()
  if (supabase) {
    try {
      const { error } = await supabase.storage.from(GED_SUPABASE_BUCKET).upload(storagePath, input.bytes, {
        contentType: input.mimeType,
        upsert: true,
      })
      if (!error) persistedPath = `${GED_SUPABASE_BUCKET}/${storagePath}`
    } catch {
      persistedPath = encodeGedDatabaseFile(input.bytes)
    }
  }

  const doc = await prisma.userDocument.upsert({
    where: { userId_type: { userId: input.userId, type: input.type } },
    create: {
      userId: input.userId,
      type: input.type,
      filename: input.filename,
      filepath: persistedPath,
      mimeType: input.mimeType,
      size: input.bytes.length,
    },
    update: {
      filename: input.filename,
      filepath: persistedPath,
      mimeType: input.mimeType,
      size: input.bytes.length,
    },
    select: { id: true, filename: true, createdAt: true },
  })
  return doc
}
