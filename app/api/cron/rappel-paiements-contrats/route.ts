import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"
import { sendOperationsAlert } from "@/lib/operations-alert"
import { logAdminActivity } from "@/lib/admin-activity"
import { isReminderUnsubscribed } from "@/lib/reminder-unsubscribe"

const LOOKBACK_DAYS = 14
const CLIENT_REMINDER_AFTER_HOURS = 24
const ADMIN_ALERT_AFTER_HOURS = 72
function getProductLabel(productType: string): string {
  if (productType === "do") return "assurance dommage ouvrage"
  if (productType === "rc_fabriquant") return "assurance RC fabriquant"
  return "assurance décennale"
}

export async function GET(request: NextRequest) {
  try {
    const denied = assertCronAuthorized(request)
    if (denied) return denied

    const now = new Date()
    const lookback = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    const candidates = await prisma.insuranceContract.findMany({
      where: {
        status: CONTRACT_STATUS.approved,
        createdAt: { gte: lookback },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            raisonSociale: true,
          },
        },
        lifecyclePayments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 300,
    })

    let reminded = 0
    let alerts = 0
    let skippedNoUser = 0
    let skippedNoPaymentIntent = 0
    let skippedTooRecent = 0
    let skippedAlreadyReminded = 0
    let skippedAlreadyAlerted = 0
    let skippedUnsubscribed = 0
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const paymentIds = candidates.map((c) => c.lifecyclePayments[0]?.id).filter(Boolean) as string[]
    const contractIds = candidates.map((c) => c.id)

    const [sentClientLogs, sentOpsLogs] = await Promise.all([
      paymentIds.length
        ? prisma.adminActivityLog.findMany({
            where: {
              action: "cron_contract_payment_client_reminder_sent",
              targetType: "contract_payment",
              targetId: { in: paymentIds },
              createdAt: { gte: todayStart },
            },
            select: { targetId: true },
          })
        : Promise.resolve([]),
      contractIds.length
        ? prisma.adminActivityLog.findMany({
            where: {
              action: "cron_contract_payment_admin_alert_sent",
              targetType: "insurance_contract",
              targetId: { in: contractIds },
              createdAt: { gte: todayStart },
            },
            select: { targetId: true },
          })
        : Promise.resolve([]),
    ])
    const alreadyRemindedPaymentIds = new Set(sentClientLogs.map((l) => l.targetId ?? ""))
    const alreadyAlertedContractIds = new Set(sentOpsLogs.map((l) => l.targetId ?? ""))

    for (const contract of candidates) {
      const user = contract.user
      const normalizedEmail = user?.email?.trim().toLowerCase() || ""
      if (!normalizedEmail) {
        skippedNoUser++
        continue
      }
      if (await isReminderUnsubscribed(normalizedEmail, "payment_reminder")) {
        skippedUnsubscribed++
        continue
      }

      const latestPayment = contract.lifecyclePayments[0]
      if (!latestPayment) {
        skippedNoPaymentIntent++
        continue
      }

      const status = (latestPayment.status || "").toLowerCase()
      // On relance uniquement si un paiement existe déjà mais n'a pas abouti.
      if (status === "paid" || status === "open" || status === "pending" || status === "authorized") {
        continue
      }
      const paymentAgeMs = now.getTime() - latestPayment.createdAt.getTime()
      const shouldRemindClient = paymentAgeMs >= CLIENT_REMINDER_AFTER_HOURS * 60 * 60 * 1000
      const shouldAlertOps = paymentAgeMs >= ADMIN_ALERT_AFTER_HOURS * 60 * 60 * 1000
      if (!shouldRemindClient && !shouldAlertOps) {
        skippedTooRecent++
        continue
      }

      const produitLabel = getProductLabel(contract.productType)
      if (shouldAlertOps) {
        if (alreadyAlertedContractIds.has(contract.id)) {
          skippedAlreadyAlerted++
        } else {
          const userLabel = user?.raisonSociale || normalizedEmail
          const alertOk = await sendOperationsAlert({
            subject: "[Optimum] Alerte admin — paiement contrat non finalisé",
            lines: [
              `Contrat: ${contract.contractNumber}`,
              `Produit: ${produitLabel}`,
              `Client: ${userLabel}`,
              `Email client: ${normalizedEmail}`,
              `Statut paiement: ${latestPayment.status}`,
              `Dernière tentative: ${latestPayment.createdAt.toISOString()}`,
              `Montant: ${latestPayment.amount.toLocaleString("fr-FR")} €`,
              `Espace client: ${SITE_URL}/espace-client`,
            ],
            replyTo: normalizedEmail,
          })
          if (alertOk) {
            alerts++
            alreadyAlertedContractIds.add(contract.id)
            await logAdminActivity({
              adminEmail: "cron@system",
              action: "cron_contract_payment_admin_alert_sent",
              targetType: "insurance_contract",
              targetId: contract.id,
              details: {
                contractNumber: contract.contractNumber,
                paymentId: latestPayment.id,
                paymentStatus: latestPayment.status,
                amount: latestPayment.amount,
                email: normalizedEmail,
              },
            })
          }
        }
      }

      if (!shouldRemindClient) continue
      if (alreadyRemindedPaymentIds.has(latestPayment.id)) {
        skippedAlreadyReminded++
        continue
      }
      const template = EMAIL_TEMPLATES.rappelPaiementContrat(
        user?.raisonSociale || contract.clientName || normalizedEmail,
        produitLabel,
        contract.premium,
        `${SITE_URL}/espace-client`,
        normalizedEmail,
        { reference: contract.contractNumber }
      )
      const emailOk = await sendEmail({
        to: normalizedEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      })

      if (!emailOk) continue

      reminded++
      alreadyRemindedPaymentIds.add(latestPayment.id)
      await logAdminActivity({
        adminEmail: "cron@system",
        action: "cron_contract_payment_client_reminder_sent",
        targetType: "contract_payment",
        targetId: latestPayment.id,
        details: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          email: normalizedEmail,
          paymentStatus: latestPayment.status,
          amount: latestPayment.amount,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      total: candidates.length,
      reminded,
      alerts,
      skippedNoUser,
      skippedNoPaymentIntent,
      skippedTooRecent,
      skippedAlreadyReminded,
      skippedAlreadyAlerted,
      skippedUnsubscribed,
    })
  } catch (error) {
    console.error("[cron rappel-paiements-contrats]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
