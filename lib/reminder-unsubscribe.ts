import { createHmac, timingSafeEqual } from "node:crypto"
import { SITE_URL } from "@/lib/site-url"
import { prisma } from "@/lib/prisma"

export type ReminderUnsubscribeType = "devis" | "signature" | "all"

export type ReminderUnsubscribeKind =
  | "devis_reminder"
  | "signature_reminder"
  | "all_reminders"

type ReminderUnsubscribePayload = {
  e: string
  k: ReminderUnsubscribeKind
  t: number
}

const UNSUB_ACTION = "email_reminder_unsubscribed"
const UNSUB_TARGET_TYPE = "reminder_unsubscribe"
const VALID_KINDS: ReminderUnsubscribeKind[] = [
  "devis_reminder",
  "signature_reminder",
  "all_reminders",
]

function toKind(type: ReminderUnsubscribeType): ReminderUnsubscribeKind {
  if (type === "devis") return "devis_reminder"
  if (type === "signature") return "signature_reminder"
  return "all_reminders"
}

function getSigningSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CRON_SECRET ||
    "dev-reminder-unsubscribe-secret"
  )
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function toTargetId(email: string, kind: ReminderUnsubscribeKind): string {
  return `${kind}:${normalizeEmail(email)}`
}

function sign(value: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(value)
    .digest("base64url")
}

function encodePayload(payload: ReminderUnsubscribePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

function decodePayload(payloadB64: string): ReminderUnsubscribePayload | null {
  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf8")
    const parsed = JSON.parse(raw) as Partial<ReminderUnsubscribePayload>
    if (
      typeof parsed.e !== "string" ||
      typeof parsed.k !== "string" ||
      typeof parsed.t !== "number"
    ) {
      return null
    }
    if (!VALID_KINDS.includes(parsed.k as ReminderUnsubscribeKind)) return null
    return {
      e: normalizeEmail(parsed.e),
      k: parsed.k as ReminderUnsubscribeKind,
      t: parsed.t,
    }
  } catch {
    return null
  }
}

export function buildReminderUnsubscribeToken(
  email: string,
  kind: ReminderUnsubscribeKind
): string {
  const payloadB64 = encodePayload({
    e: normalizeEmail(email),
    k: kind,
    t: Date.now(),
  })
  const sig = sign(payloadB64)
  return `${payloadB64}.${sig}`
}

export function parseReminderUnsubscribeToken(token: string): {
  email: string
  kind: ReminderUnsubscribeKind
} | null {
  const [payloadB64, signature] = token.split(".")
  if (!payloadB64 || !signature) return null
  const expected = sign(payloadB64)
  const signatureBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (signatureBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(signatureBuf, expectedBuf)) return null
  const payload = decodePayload(payloadB64)
  if (!payload) return null
  return {
    email: payload.e,
    kind: payload.k,
  }
}

export function buildReminderUnsubscribeUrl(
  type: ReminderUnsubscribeType,
  email: string
): string {
  const kind = toKind(type)
  const token = buildReminderUnsubscribeToken(email, kind)
  return `${SITE_URL}/api/email/unsubscribe?token=${encodeURIComponent(token)}`
}

export async function isReminderUnsubscribed(
  email: string,
  kind: ReminderUnsubscribeKind | ReminderUnsubscribeType
): Promise<boolean> {
  const normalizedKind = kind.includes("_reminder")
    ? (kind as ReminderUnsubscribeKind)
    : toKind(kind as ReminderUnsubscribeType)
  const normalized = normalizeEmail(email)
  const match = await prisma.adminActivityLog.findFirst({
    where: {
      action: UNSUB_ACTION,
      targetType: UNSUB_TARGET_TYPE,
      targetId: {
        in: [toTargetId(normalized, normalizedKind), toTargetId(normalized, "all_reminders")],
      },
    },
    select: { id: true },
  })
  return Boolean(match)
}

export async function markReminderUnsubscribed(
  email: string,
  kind: ReminderUnsubscribeKind
): Promise<"created" | "already"> {
  const normalized = normalizeEmail(email)
  const targetId = toTargetId(normalized, kind)
  const existing = await prisma.adminActivityLog.findFirst({
    where: {
      action: UNSUB_ACTION,
      targetType: UNSUB_TARGET_TYPE,
      targetId,
    },
    select: { id: true },
  })
  if (existing) return "already"

  await prisma.adminActivityLog.create({
    data: {
      adminEmail: "unsubscribe@system",
      action: UNSUB_ACTION,
      targetType: UNSUB_TARGET_TYPE,
      targetId,
      details: JSON.stringify({
        email: normalized,
        kind,
      }),
    },
  })
  return "created"
}

