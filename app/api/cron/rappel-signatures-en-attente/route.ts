import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"
import { logAdminActivity } from "@/lib/admin-activity"
import { sendOperationsAlert } from "@/lib/operations-alert"

const CLIENT_REMINDER_AFTER_HOURS = 24
const ADMIN_ALERT_AFTER_HOURS = 72
const MAX_PENDING_SIGNATURES = 500

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function dayKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function getSignatureReminderPayload(
  pending: { contractData: string; contractNumero: string; signatureRequestId: string },
  userLabel: string
): {
  raisonSociale: string
  signatureLink: string
  produitLabel: string
  reference?: string
} {
  let data: Record<string, unknown> = {}
  try {
    data = asObject(JSON.parse(pending.contractData || "{}"))
  } catch {
    data = {}
  }

  const custom = data.customUploadedDevisFlow === true
  const produitLabelRaw = typeof data.produitLabel === "string" ? data.produitLabel.trim() : ""
  const produitLabel = custom
    ? produitLabelRaw || "proposition commerciale"
    : "contrat décennale"
  const referenceRaw =
    typeof data.devisReference === "string"
      ? data.devisReference.trim()
      : pending.contractNumero.trim()
  const nextPathRaw = typeof data.afterSignNextPath === "string" ? data.afterSignNextPath.trim() : ""
  const nextPath = nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
    ? nextPathRaw
    : "/signature/callback?success=1"
  const signatureLink = `${SITE_URL}/sign/${pending.signatureRequestId}?next=${encodeURIComponent(nextPath)}`

  return {
    raisonSociale: userLabel,
    signatureLink,
    produitLabel,
    reference: referenceRaw || undefined,
  }
}

/**
 * Cron : relance des signatures en attente.
 * - Relance client après 24h (idempotence journalière via admin_activity_logs).
 * - Alerte admin si une signature dépasse 72h.
 */
export async function GET(request: NextRequest) {
  try {
    const denied = assertCronAuthorized(request)
    if (denied) return denied

    const now = new Date()
    const todayStart = startOfUtcDay(now)
    const dayKey = dayKeyUtc(now)
    const clientReminderThreshold = new Date(now.getTime() - CLIENT_REMINDER_AFTER_HOURS * 60 * 60 * 1000)

    const pendingSignatures = await prisma.pendingSignature.findMany({
      where: { createdAt: { lte: clientReminderThreshold } },
      orderBy: { createdAt: "asc" },
      take: MAX_PENDING_SIGNATURES,
    })

    if (pendingSignatures.length === 0) {
      return NextResponse.json({ ok: true, total: 0, reminded: 0, skippedAlreadySent: 0, failed: 0 })
    }

    const signatureIds = pendingSignatures.map((p) => p.signatureRequestId)
    const userIds = [...new Set(pendingSignatures.map((p) => p.userId))]

    const [users, sentTodayLogs] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, raisonSociale: true },
      }),
      prisma.adminActivityLog.findMany({
        where: {
          action: "cron_signature_reminder_client_sent",
          targetType: "pending_signature",
          targetId: { in: signatureIds },
          createdAt: { gte: todayStart },
        },
        select: { targetId: true },
      }),
    ])

    const userById = new Map(users.map((u) => [u.id, u]))
    const alreadySentIds = new Set(sentTodayLogs.map((l) => l.targetId ?? ""))

    let reminded = 0
    let skippedAlreadySent = 0
    let failed = 0
    let missingUser = 0

    const staleRows: Array<{ signatureRequestId: string; ageHours: number; email: string }> = []

    for (const pending of pendingSignatures) {
      const ageHours = Math.floor((now.getTime() - pending.createdAt.getTime()) / (1000 * 60 * 60))
      const user = userById.get(pending.userId)
      const email = user?.email?.trim().toLowerCase() || ""

      if (ageHours >= ADMIN_ALERT_AFTER_HOURS && email) {
        staleRows.push({ signatureRequestId: pending.signatureRequestId, ageHours, email })
      }

      if (alreadySentIds.has(pending.signatureRequestId)) {
        skippedAlreadySent++
        continue
      }
      if (!email) {
        missingUser++
        continue
      }

      const userLabel = (user?.raisonSociale || user?.email || "Client").trim()
      const payload = getSignatureReminderPayload(pending, userLabel)
      const tpl = EMAIL_TEMPLATES.rappelSignatureEnAttente(
        payload.raisonSociale,
        payload.signatureLink,
        { produitLabel: payload.produitLabel, reference: payload.reference }
      )

      const ok = await sendEmail({
        to: email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
      })

      if (!ok) {
        failed++
        continue
      }

      reminded++
      await logAdminActivity({
        adminEmail: "cron@system",
        action: "cron_signature_reminder_client_sent",
        targetType: "pending_signature",
        targetId: pending.signatureRequestId,
        details: {
          email,
          ageHours,
          dayKey,
          produitLabel: payload.produitLabel,
          reference: payload.reference ?? null,
        },
      })
    }

    const adminAlertTargetId = `signature-stale-${dayKey}`
    let adminAlertSent = false
    if (staleRows.length > 0) {
      const alreadyAlerted = await prisma.adminActivityLog.findFirst({
        where: {
          action: "cron_signature_admin_alert_sent",
          targetType: "cron",
          targetId: adminAlertTargetId,
        },
        select: { id: true },
      })
      if (!alreadyAlerted) {
        const top = staleRows.slice(0, 10)
        const ok = await sendOperationsAlert({
          subject: `[Optimum] Alerte signatures en attente (${staleRows.length})`,
          lines: [
            `Signatures en attente depuis plus de ${ADMIN_ALERT_AFTER_HOURS}h : ${staleRows.length}`,
            ...top.map(
              (r, i) =>
                `${i + 1}. ${r.email} — ${r.signatureRequestId} — ${r.ageHours}h`
            ),
            staleRows.length > top.length
              ? `... ${staleRows.length - top.length} autre(s) dossier(s)`
              : "",
          ].filter(Boolean),
        })
        if (ok) {
          adminAlertSent = true
          await logAdminActivity({
            adminEmail: "cron@system",
            action: "cron_signature_admin_alert_sent",
            targetType: "cron",
            targetId: adminAlertTargetId,
            details: { count: staleRows.length, dayKey },
          })
        }
      }
    }

    return NextResponse.json({
      ok: true,
      total: pendingSignatures.length,
      reminded,
      skippedAlreadySent,
      missingUser,
      failed,
      staleCount: staleRows.length,
      adminAlertSent,
    })
  } catch (error) {
    console.error("[cron rappel-signatures-en-attente]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
