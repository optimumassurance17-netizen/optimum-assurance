import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"
import { sendOperationsAlert } from "@/lib/operations-alert"
import { logAdminActivity } from "@/lib/admin-activity"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { isReminderUnsubscribed } from "@/lib/reminder-unsubscribe"

const CLIENT_REMINDER_AFTER_HOURS = 24
const ADMIN_ALERT_AFTER_HOURS = 72
const MAX_PENDING_SIGNATURES = 500
const MAX_APPROVED_CONTRACTS = 500

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function dayKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function productLabel(productType: string): string {
  if (productType === "do") return "dommage ouvrage"
  if (productType === "rc_fabriquant") return "RC fabriquant"
  return "décennale"
}

/**
 * Cron "lot 3" : relance des dossiers incomplets.
 * - Signature en attente >24h => relance client (idempotence journalière)
 * - Contrat approuvé non payé >24h => relance client (idempotence journalière)
 * - Blocage >72h => alerte opérations (idempotence journalière)
 */
export async function GET(request: NextRequest) {
  try {
    const denied = assertCronAuthorized(request)
    if (denied) return denied

    const now = new Date()
    const todayStart = startOfUtcDay(now)
    const dayKey = dayKeyUtc(now)
    const reminderThreshold = new Date(now.getTime() - CLIENT_REMINDER_AFTER_HOURS * 60 * 60 * 1000)

    const [pendingSignatures, approvedContracts] = await Promise.all([
      prisma.pendingSignature.findMany({
        where: { createdAt: { lte: reminderThreshold } },
        orderBy: { createdAt: "asc" },
        take: MAX_PENDING_SIGNATURES,
      }),
      prisma.insuranceContract.findMany({
        where: {
          status: CONTRACT_STATUS.approved,
          paidAt: null,
          createdAt: { lte: reminderThreshold },
        },
        select: {
          id: true,
          contractNumber: true,
          productType: true,
          clientName: true,
          createdAt: true,
          user: { select: { id: true, email: true, raisonSociale: true } },
        },
        orderBy: { createdAt: "asc" },
        take: MAX_APPROVED_CONTRACTS,
      }),
    ])

    const signatureIds = pendingSignatures.map((s) => s.signatureRequestId)
    const contractIds = approvedContracts.map((c) => c.id)
    const userIdsFromSignatures = [...new Set(pendingSignatures.map((p) => p.userId))]

    const [signatureUsers, signatureSentToday, contractSentToday, signatureAdminAlertsToday, contractAdminAlertsToday] = await Promise.all([
      userIdsFromSignatures.length > 0
        ? prisma.user.findMany({
            where: { id: { in: userIdsFromSignatures } },
            select: { id: true, email: true, raisonSociale: true },
          })
        : Promise.resolve([]),
      signatureIds.length > 0
        ? prisma.adminActivityLog.findMany({
            where: {
              action: "cron_incomplete_signature_client_reminder_sent",
              targetType: "pending_signature",
              targetId: { in: signatureIds },
              createdAt: { gte: todayStart },
            },
            select: { targetId: true },
          })
        : Promise.resolve([]),
      contractIds.length > 0
        ? prisma.adminActivityLog.findMany({
            where: {
              action: "cron_incomplete_contract_client_reminder_sent",
              targetType: "insurance_contract",
              targetId: { in: contractIds },
              createdAt: { gte: todayStart },
            },
            select: { targetId: true },
          })
        : Promise.resolve([]),
      signatureIds.length > 0
        ? prisma.adminActivityLog.findMany({
            where: {
              action: "cron_incomplete_signature_admin_alert_sent",
              targetType: "pending_signature",
              targetId: { in: signatureIds },
              createdAt: { gte: todayStart },
            },
            select: { targetId: true },
          })
        : Promise.resolve([]),
      contractIds.length > 0
        ? prisma.adminActivityLog.findMany({
            where: {
              action: "cron_incomplete_contract_admin_alert_sent",
              targetType: "insurance_contract",
              targetId: { in: contractIds },
              createdAt: { gte: todayStart },
            },
            select: { targetId: true },
          })
        : Promise.resolve([]),
    ])

    const signatureUserById = new Map(signatureUsers.map((u) => [u.id, u]))
    const signatureSentTodaySet = new Set(signatureSentToday.map((l) => l.targetId ?? ""))
    const contractSentTodaySet = new Set(contractSentToday.map((l) => l.targetId ?? ""))
    const signatureAdminAlertedSet = new Set(signatureAdminAlertsToday.map((l) => l.targetId ?? ""))
    const contractAdminAlertedSet = new Set(contractAdminAlertsToday.map((l) => l.targetId ?? ""))

    let signatureClientReminded = 0
    let contractClientReminded = 0
    let signatureAdminAlerted = 0
    let contractAdminAlerted = 0
    let skippedNoEmail = 0
    let skippedAlreadyDoneToday = 0
    let skippedUnsubscribed = 0

    for (const pending of pendingSignatures) {
      const user = signatureUserById.get(pending.userId)
      const email = user?.email?.trim().toLowerCase() || ""
      if (!email) {
        skippedNoEmail++
        continue
      }
      const ageHours = Math.floor((now.getTime() - pending.createdAt.getTime()) / (1000 * 60 * 60))
      const userLabel = (user?.raisonSociale || user?.email || "Client").trim()
      const link = `${SITE_URL}/sign/${pending.signatureRequestId}?next=${encodeURIComponent("/signature/callback?success=1")}`

      if (!signatureSentTodaySet.has(pending.signatureRequestId)) {
        if (await isReminderUnsubscribed(email, "dossier_incomplete_reminder")) {
          skippedUnsubscribed++
          continue
        }
        const tpl = EMAIL_TEMPLATES.rappelDossierIncomplet(
          userLabel,
          link,
          email,
          {
            produitLabel: "signature électronique",
            reference: pending.contractNumero,
          }
        )
        const ok = await sendEmail({
          to: email,
          subject: tpl.subject,
          text: tpl.text,
          html: tpl.html,
        })
        if (ok) {
          signatureClientReminded++
          signatureSentTodaySet.add(pending.signatureRequestId)
          await logAdminActivity({
            adminEmail: "cron@system",
            action: "cron_incomplete_signature_client_reminder_sent",
            targetType: "pending_signature",
            targetId: pending.signatureRequestId,
            details: { email, ageHours, dayKey },
          })
        }
      } else {
        skippedAlreadyDoneToday++
      }

      if (ageHours >= ADMIN_ALERT_AFTER_HOURS && !signatureAdminAlertedSet.has(pending.signatureRequestId)) {
        const ok = await sendOperationsAlert({
          subject: `[Optimum] Dossier incomplet — signature bloquée (${ageHours}h)`,
          lines: [
            `Type : signature en attente`,
            `Email : ${email}`,
            `Référence : ${pending.contractNumero}`,
            `Signature request : ${pending.signatureRequestId}`,
            `Âge : ${ageHours}h`,
          ],
          replyTo: email,
        })
        if (ok) {
          signatureAdminAlerted++
          signatureAdminAlertedSet.add(pending.signatureRequestId)
          await logAdminActivity({
            adminEmail: "cron@system",
            action: "cron_incomplete_signature_admin_alert_sent",
            targetType: "pending_signature",
            targetId: pending.signatureRequestId,
            details: { email, ageHours, dayKey },
          })
        }
      }
    }

    for (const contract of approvedContracts) {
      const user = contract.user
      const email = user?.email?.trim().toLowerCase() || ""
      if (!email) {
        skippedNoEmail++
        continue
      }
      const ageHours = Math.floor((now.getTime() - contract.createdAt.getTime()) / (1000 * 60 * 60))
      const userLabel = (user?.raisonSociale || contract.clientName || email).trim()
      const produit = productLabel(contract.productType)
      const espaceClient = `${SITE_URL}/espace-client`

      if (!contractSentTodaySet.has(contract.id)) {
        if (await isReminderUnsubscribed(email, "dossier_incomplete_reminder")) {
          skippedUnsubscribed++
          continue
        }
        const tpl = EMAIL_TEMPLATES.rappelDossierIncomplet(
          userLabel,
          espaceClient,
          email,
          {
            produitLabel: `${produit} (paiement en attente)`,
            reference: contract.contractNumber,
          }
        )
        const ok = await sendEmail({
          to: email,
          subject: tpl.subject,
          text: tpl.text,
          html: tpl.html,
        })
        if (ok) {
          contractClientReminded++
          contractSentTodaySet.add(contract.id)
          await logAdminActivity({
            adminEmail: "cron@system",
            action: "cron_incomplete_contract_client_reminder_sent",
            targetType: "insurance_contract",
            targetId: contract.id,
            details: {
              email,
              ageHours,
              dayKey,
              contractNumber: contract.contractNumber,
              productType: contract.productType,
            },
          })
        }
      } else {
        skippedAlreadyDoneToday++
      }

      if (ageHours >= ADMIN_ALERT_AFTER_HOURS && !contractAdminAlertedSet.has(contract.id)) {
        const ok = await sendOperationsAlert({
          subject: `[Optimum] Dossier incomplet — contrat approuvé non payé (${ageHours}h)`,
          lines: [
            `Type : contrat approuvé non payé`,
            `Produit : ${produit}`,
            `Email : ${email}`,
            `Contrat : ${contract.contractNumber}`,
            `Âge : ${ageHours}h`,
            `Espace client : ${espaceClient}`,
          ],
          replyTo: email,
        })
        if (ok) {
          contractAdminAlerted++
          contractAdminAlertedSet.add(contract.id)
          await logAdminActivity({
            adminEmail: "cron@system",
            action: "cron_incomplete_contract_admin_alert_sent",
            targetType: "insurance_contract",
            targetId: contract.id,
            details: {
              email,
              ageHours,
              dayKey,
              contractNumber: contract.contractNumber,
              productType: contract.productType,
            },
          })
        }
      }
    }

    return NextResponse.json({
      ok: true,
      signaturePendingTotal: pendingSignatures.length,
      contractApprovedUnpaidTotal: approvedContracts.length,
      signatureClientReminded,
      contractClientReminded,
      signatureAdminAlerted,
      contractAdminAlerted,
      skippedNoEmail,
      skippedAlreadyDoneToday,
      skippedUnsubscribed,
    })
  } catch (error) {
    console.error("[cron rappel-dossiers-incomplets]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
