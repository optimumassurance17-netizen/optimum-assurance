import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logAdminActivity } from "@/lib/admin-activity"
import { checkRateLimitMemory, getClientIp } from "@/lib/rate-limit"

const ALLOWED_EVENTS = new Set([
  "devis_started",
  "devis_completed",
  "do_devis_started",
  "do_devis_completed",
  "souscription_started",
  "souscription_completed",
  "account_created",
  "signature_started",
  "signature_completed",
  "mandat_sepa_started",
  "mandat_sepa_completed",
  "payment_started",
  "payment_redirected",
])

function asShortString(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_.:-]{1,60}$/.test(key)) continue
    if (typeof raw === "string") out[key] = raw.slice(0, 300)
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw
    else if (typeof raw === "boolean") out[key] = raw
    else if (raw == null) out[key] = null
  }
  return out
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimitMemory(`conversion:${ip}`, 80, 60_000)
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    )
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const event = asShortString(body.event, 80)
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: "Événement invalide" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const visitorId = asShortString(body.visitorId, 80)
    const path = asShortString(body.path, 300)
    const product = asShortString(body.product, 80)
    const source = asShortString(body.source, 120)

    await logAdminActivity({
      adminEmail: "conversion@system",
      action: `conversion_${event}`,
      targetType: session?.user?.id ? "user" : "visitor",
      targetId: session?.user?.id || visitorId,
      details: {
        event,
        visitorId: visitorId || null,
        userId: session?.user?.id || null,
        path: path || null,
        product: product || null,
        source: source || null,
        metadata: sanitizeMetadata(body.metadata),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[conversion/track]", error)
    return NextResponse.json({ error: "Erreur tracking" }, { status: 500 })
  }
}
