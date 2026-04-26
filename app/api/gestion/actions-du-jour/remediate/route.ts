import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { SITE_URL } from "@/lib/site-url"
import { prisma } from "@/lib/prisma"

type DdaRemediationPayload = {
  kind: "dda"
  toEmail: string
  clientLabel: string
  produitLabel: string
  ctaPath: string
  reference?: string
  missing?: string
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeInternalPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/espace-client"
  return trimmed.slice(0, 512)
}

function buildAbsoluteUrl(path: string): string {
  const normalized = normalizeInternalPath(path)
  return `${SITE_URL}${normalized}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }

    const payload = body as {
      actionId?: unknown
      remediation?: unknown
    }

    const actionId = asTrimmedString(payload.actionId)
    if (!actionId || actionId.length > 180) {
      return NextResponse.json({ error: "actionId invalide" }, { status: 400 })
    }

    if (!payload.remediation || typeof payload.remediation !== "object") {
      return NextResponse.json({ error: "remediation requis" }, { status: 400 })
    }

    const remediation = payload.remediation as Partial<DdaRemediationPayload>
    if (remediation.kind !== "dda") {
      return NextResponse.json({ error: "Type de remediation non supporté" }, { status: 400 })
    }

    const toEmail = asTrimmedString(remediation.toEmail).toLowerCase()
    const clientLabel = asTrimmedString(remediation.clientLabel) || "Client"
    const produitLabel = asTrimmedString(remediation.produitLabel) || "dossier"
    const ctaPath = normalizeInternalPath(asTrimmedString(remediation.ctaPath))
    const reference = asTrimmedString(remediation.reference)
    const missing = asTrimmedString(remediation.missing)

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)
    if (!isEmailValid) {
      return NextResponse.json({ error: "Email de remédiation invalide" }, { status: 400 })
    }

    const todayStart = startOfUtcDay(new Date())
    const already = await prisma.adminActivityLog.findFirst({
      where: {
        action: "dashboard_action_auto_remediated",
        targetType: "dashboard_action",
        targetId: actionId,
        createdAt: { gte: todayStart },
      },
      select: { id: true },
    })
    if (already) {
      return NextResponse.json({ ok: true, alreadySent: true })
    }

    const ctaUrl = buildAbsoluteUrl(ctaPath)
    const tpl = EMAIL_TEMPLATES.relanceConformiteDda(clientLabel, {
      produitLabel,
      ctaUrl,
      ...(reference ? { reference } : {}),
      ...(missing ? { manque: missing } : {}),
    })

    const replyTo = session.user.email?.trim()
    const sent = await sendEmail({
      to: toEmail,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      ...(replyTo ? { replyTo } : {}),
    })

    if (!sent) {
      return NextResponse.json(
        { error: "Envoi impossible (Resend non disponible)." },
        { status: 503 }
      )
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "dashboard_action_auto_remediated",
      targetType: "dashboard_action",
      targetId: actionId,
      details: {
        remediationKind: "dda",
        toEmail,
        produitLabel,
        ctaPath,
        reference: reference || null,
      },
    })

    return NextResponse.json({ ok: true, sent: true })
  } catch (error) {
    console.error("[gestion/actions-du-jour/remediate]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
