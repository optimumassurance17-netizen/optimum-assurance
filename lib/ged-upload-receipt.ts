import { createHmac, timingSafeEqual } from "node:crypto"
import { GED_MAX_FILE_BYTES, isOwnedGedObjectPath } from "@/lib/ged-policy"

export type GedUploadReceipt = {
  userId: string
  type: string
  bucket: string
  storagePath: string
  size: number
  mimeType: string
  filename: string
  exp: number
}

const RECEIPT_TTL_MS = 15 * 60 * 1000

export function gedUploadSecret(): string | null {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  return secret || null
}

function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url")
}

function isReceipt(value: unknown): value is GedUploadReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.userId === "string" &&
    typeof row.type === "string" &&
    typeof row.bucket === "string" &&
    typeof row.storagePath === "string" &&
    typeof row.size === "number" &&
    Number.isFinite(row.size) &&
    typeof row.mimeType === "string" &&
    typeof row.filename === "string" &&
    typeof row.exp === "number" &&
    Number.isFinite(row.exp)
  )
}

export function issueGedUploadReceipt(
  input: Omit<GedUploadReceipt, "exp">,
  secret: string,
  now = Date.now()
): string {
  const payload: GedUploadReceipt = { ...input, exp: now + RECEIPT_TTL_MS }
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  return `${body}.${signBody(body, secret)}`
}

export function readGedUploadReceipt(token: string, secret: string, now = Date.now()): GedUploadReceipt | null {
  const dot = token.indexOf(".")
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null
  const body = token.slice(0, dot)
  const mac = token.slice(dot + 1)
  const expected = signBody(body, secret)
  const given = Buffer.from(mac)
  const wanted = Buffer.from(expected)
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown
  } catch {
    return null
  }
  if (!isReceipt(parsed)) return null
  if (parsed.exp <= now) return null
  if (parsed.size <= 0 || parsed.size > GED_MAX_FILE_BYTES) return null
  if (!parsed.bucket.trim() || parsed.bucket.includes("/") || parsed.bucket.includes("..")) return null
  if (!isOwnedGedObjectPath(parsed.userId, parsed.storagePath)) return null
  if (!parsed.mimeType.trim() || parsed.filename.trim().length === 0 || parsed.filename.length > 180) return null
  if (!parsed.type.trim() || parsed.type.includes("/") || parsed.type.includes("..")) return null
  return parsed
}
