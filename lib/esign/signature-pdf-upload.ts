import { prisma } from "@/lib/prisma"
import {
  MAX_LOCAL_SIGNATURE_PDF_BYTES,
  SIGNATURE_PDF_UPLOAD_CHUNK_BYTES,
  signaturePdfTooLargeMessage,
} from "@/lib/esign/local-signature-fallback"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/
const MAX_CHUNKS = Math.ceil(MAX_LOCAL_SIGNATURE_PDF_BYTES / SIGNATURE_PDF_UPLOAD_CHUNK_BYTES)

let tableReady: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = prisma
      .$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "SignaturePdfUploadChunk" (
          "token" TEXT NOT NULL,
          "index" INTEGER NOT NULL,
          "total" INTEGER NOT NULL,
          "adminEmail" TEXT NOT NULL,
          "bytesBase64" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY ("token", "index")
        )`
      )
      .then(() => undefined)
      .catch((error: unknown) => {
        tableReady = null
        throw error
      })
  }
  await tableReady
}

async function forgetOldChunks(): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "SignaturePdfUploadChunk"
    WHERE "createdAt" < NOW() - INTERVAL '2 hours'
  `
}

export async function saveSignaturePdfChunk(input: {
  token: string
  index: number
  total: number
  data: string
  adminEmail: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const token = input.token.trim()
  const data = input.data.replace(/\s/g, "")
  if (!UUID_RE.test(token)) return { ok: false, error: "Envoi de PDF invalide.", status: 400 }
  if (!Number.isInteger(input.total) || input.total < 1 || input.total > MAX_CHUNKS) {
    return { ok: false, error: signaturePdfTooLargeMessage(), status: 400 }
  }
  if (!Number.isInteger(input.index) || input.index < 0 || input.index >= input.total) {
    return { ok: false, error: "Morceau de PDF invalide.", status: 400 }
  }
  const maxChars = Math.ceil(SIGNATURE_PDF_UPLOAD_CHUNK_BYTES * 1.4)
  if (data.length < 4 || data.length > maxChars || !BASE64_RE.test(data)) {
    return { ok: false, error: "Morceau de PDF illisible.", status: 400 }
  }

  await ensureTable()
  await forgetOldChunks()
  await prisma.$executeRaw`
    INSERT INTO "SignaturePdfUploadChunk" ("token", "index", "total", "adminEmail", "bytesBase64")
    VALUES (${token}, ${input.index}, ${input.total}, ${input.adminEmail}, ${data})
    ON CONFLICT ("token", "index") DO UPDATE
      SET "bytesBase64" = EXCLUDED."bytesBase64", "total" = EXCLUDED."total"
  `
  return { ok: true }
}

export async function takeSignaturePdfUpload(token: string, adminEmail: string): Promise<Buffer> {
  const id = token.trim()
  if (!UUID_RE.test(id)) {
    throw new Error("Envoi de PDF invalide.")
  }
  await ensureTable()
  const rows = await prisma.$queryRaw<Array<{ index: number; total: number; adminEmail: string; bytesBase64: string }>>`
    SELECT "index", "total", "adminEmail", "bytesBase64"
    FROM "SignaturePdfUploadChunk"
    WHERE "token" = ${id}
    ORDER BY "index" ASC
  `
  if (rows.length === 0) {
    throw new Error("Le PDF n'a pas été reçu. Sélectionnez-le à nouveau.")
  }
  if (rows.some((row) => row.adminEmail !== adminEmail)) {
    throw new Error("Envoi de PDF invalide.")
  }
  const total = Number(rows[0]?.total)
  if (!Number.isInteger(total) || rows.length !== total || rows.some((row, position) => Number(row.index) !== position)) {
    throw new Error("Le PDF est incomplet. Sélectionnez-le à nouveau.")
  }
  const parts = rows.map((row) => Buffer.from(row.bytesBase64, "base64"))
  const buf = Buffer.concat(parts)
  if (buf.length > MAX_LOCAL_SIGNATURE_PDF_BYTES) {
    await deleteSignaturePdfUpload(id)
    throw new Error(signaturePdfTooLargeMessage())
  }
  return buf
}

export async function deleteSignaturePdfUpload(token: string): Promise<void> {
  const id = token.trim()
  if (!UUID_RE.test(id)) return
  await ensureTable()
  await prisma.$executeRaw`DELETE FROM "SignaturePdfUploadChunk" WHERE "token" = ${id}`
}
