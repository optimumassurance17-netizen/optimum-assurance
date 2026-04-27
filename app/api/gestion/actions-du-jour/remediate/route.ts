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

type RemediationInput = {
  actionId?: unknown
  remediation?: unknown
}

type RemediationResult =
  | { actionId: string; status: "sent" }
  | { actionId: string; status: "already_sent" }
  | { actionId: string; status: "failed"; error: string; statusCode: number }

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

async function remediateSingleDdaAction(params: {
  input: RemediationInput
  todayStart: Date
  adminEmail: string
  replyTo?: string
}): Promise<RemediationResult> {
  const actionId = asTrimmedString(params.input.actionId)
  if (!actionId || actionId.length > 180) {
    return {
      actionId: actionId || "unknown",
      status: "failed",
      error: "actionId invalide",
      statusCode: 400,
    }
  }

  if (!params.input.remediation || typeof params.input.remediation !== "object") {
    return { actionId, status: "failed", error: "remediation requis", statusCode: 400 }
  }

  const remediation = params.input.remediation as Partial<DdaRemediationPayload>
  if (remediation.kind !== "dda") {
    return {
      actionId,
      status: "failed",
      error: "Type de remediation non supporté",
      statusCode: 400,
    }
  }

  const toEmail = asTrimmedString(remediation.toEmail).toLowerCase()
  const clientLabel = asTrimmedString(remediation.clientLabel) || "Client"
  const produitLabel = asTrimmedString(remediation.produitLabel) || "dossier"
  const ctaPath = normalizeInternalPath(asTrimmedString(remediation.ctaPath))
  const reference = asTrimmedString(remediation.reference)
  const missing = asTrimmedString(remediation.missing)

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)
  if (!isEmailValid) {
    return {
      actionId,
      status: "failed",
      error: "Email de remédiation invalide",
      statusCode: 400,
    }
  }

  const already = await prisma.adminActivityLog.findFirst({
    where: {
      action: "dashboard_action_auto_remediated",
      targetType: "dashboard_action",
      targetId: actionId,
      createdAt: { gte: params.todayStart },
    },
    select: { id: true },
  })
  if (already) {
    return { actionId, status: "already_sent" }
  }

  const ctaUrl = buildAbsoluteUrl(ctaPath)
  const tpl = EMAIL_TEMPLATES.relanceConformiteDda(clientLabel, {
    produitLabel,
    ctaUrl,
    ...(reference ? { reference } : {}),
    ...(missing ? { manque: missing } : {}),
  })

  const sent = await sendEmail({
    to: toEmail,
    subject: tpl.subject,
    text: tpl.text,
    html: tpl.html,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  })

  if (!sent) {
    return {
      actionId,
      status: "failed",
      error: "Envoi impossible (Resend non disponible).",
      statusCode: 503,
    }
  }

  await logAdminActivity({
    adminEmail: params.adminEmail,
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

  return { actionId, status: "sent" }
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
      items?: unknown
    }
    const itemsRaw = Array.isArray(payload.items) ? payload.items : null
    const todayStart = startOfUtcDay(new Date())
    const adminEmail = session.user.email || "admin"
    const replyTo = session.user.email?.trim()

    // Compatibilité : ancien format (single action).
    if (!itemsRaw) {
      const singleResult = await remediateSingleDdaAction({
        input: payload,
        todayStart,
        adminEmail,
        replyTo,
      })
      if (singleResult.status === "failed") {
        return NextResponse.json(
          { error: singleResult.error },
          { status: singleResult.statusCode }
        )
      }
      if (singleResult.status === "already_sent") {
        return NextResponse.json({ ok: true, alreadySent: true })
      }
      return NextResponse.json({ ok: true, sent: true })
    }

    if (itemsRaw.length === 0 || itemsRaw.length > 100) {
      return NextResponse.json(
        { error: "items invalide (1 à 100 éléments attendus)." },
        { status: 400 }
      )
    }

    const deduped = new Map<string, RemediationInput>()
    for (const item of itemsRaw) {
      if (!item || typeof item !== "object") continue
      const row = item as RemediationInput
      const id = asTrimmedString(row.actionId)
      if (!id) continue
      if (!deduped.has(id)) deduped.set(id, row)
    }
    const inputs = [...deduped.values()]
    if (inputs.length === 0) {
      return NextResponse.json({ error: "Aucune action valide à remédier." }, { status: 400 })
    }

    const results: RemediationResult[] = []
    for (const input of inputs) {
      const row = await remediateSingleDdaAction({
        input,
        todayStart,
        adminEmail,
        replyTo,
      })
      results.push(row)
    }

    const summary = {
      total: results.length,
      sent: results.filter((row) => row.status === "sent").length,
      alreadySent: results.filter((row) => row.status === "already_sent").length,
      failed: results.filter((row) => row.status === "failed").length,
    }

    return NextResponse.json({
      ok: summary.failed < summary.total,
      summary,
      results: results.map((row) => ({
        actionId: row.actionId,
        status: row.status,
        ...(row.status === "failed" ? { error: row.error } : {}),
      })),
    })
  } catch (error) {
    console.error("[gestion/actions-du-jour/remediate]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
