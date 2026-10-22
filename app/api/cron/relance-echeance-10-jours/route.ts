import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { isReminderUnsubscribed } from "@/lib/reminder-unsubscribe"
import { primeTrimestrielle } from "@/lib/premium"
import { loadClientEcheances } from "@/lib/client-echeance-service"
import { renderFactureEcheancePdf } from "@/lib/facture-echeance-pdf"
import {
  calendarDaysUntil,
  echeanceReminderIsDue,
  echeanceReminderQueryRange,
  echeanceReminderTargetId,
  factureEcheanceNumero,
  formatEcheanceDay,
  parisCalendarDay,
} from "@/lib/echeance-reminder"

const REMINDER_ACTION = "cron_echeance_reminder_10d_sent"

/**
 * Envoie, sans déclenchement manuel, la facture et le rappel 10 jours avant
 * le prélèvement SEPA trimestriel. Les autres relances restent manuelles.
 */
export async function GET(request: NextRequest) {
  try {
    const denied = assertCronAuthorized(request)
    if (denied) return denied

    const now = new Date()
    const range = echeanceReminderQueryRange(now)
    const subscriptions = await prisma.sepaSubscription.findMany({
      where: {
        status: { in: ["active", "pending_mandate"] },
        nextSepaDue: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        userId: true,
        primeAnnuelle: true,
        nextSepaDue: true,
        user: {
          select: {
            email: true,
            raisonSociale: true,
            siret: true,
            adresse: true,
            codePostal: true,
            ville: true,
          },
        },
      },
      orderBy: { nextSepaDue: "asc" },
      take: 200,
    })

    const dueSubscriptions = subscriptions.filter(
      (subscription) => subscription.nextSepaDue && echeanceReminderIsDue(subscription.nextSepaDue, now)
    )
    const targetIds = dueSubscriptions.map((subscription) =>
      echeanceReminderTargetId(subscription.id, subscription.nextSepaDue as Date)
    )
    const alreadySentLogs = targetIds.length
      ? await prisma.adminActivityLog.findMany({
          where: {
            action: REMINDER_ACTION,
            targetType: "sepa_subscription",
            targetId: { in: targetIds },
          },
          select: { targetId: true },
        })
      : []
    const alreadySent = new Set(alreadySentLogs.map((log) => log.targetId ?? ""))

    let reminded = 0
    let skippedAlreadySent = 0
    let skippedNoEmail = 0
    let skippedUnsubscribed = 0
    let skippedNoAmount = 0
    let pdfFailed = 0
    let emailFailed = 0

    for (const subscription of dueSubscriptions) {
      const due = subscription.nextSepaDue
      if (!due) continue
      const targetId = echeanceReminderTargetId(subscription.id, due)
      if (alreadySent.has(targetId)) {
        skippedAlreadySent++
        continue
      }

      const email = subscription.user.email?.trim().toLowerCase() || ""
      if (!email) {
        skippedNoEmail++
        continue
      }
      if (await isReminderUnsubscribed(email, "payment_reminder")) {
        skippedUnsubscribed++
        continue
      }

      const amount = primeTrimestrielle(subscription.primeAnnuelle)
      if (!(amount > 0)) {
        skippedNoAmount++
        continue
      }

      const rows = await loadClientEcheances(subscription.userId)
      const nextUnpaid = rows.find((row) => row.kind === "decennale" && !row.paid)
      const label = nextUnpaid?.label?.trim() || "échéance trimestrielle"
      const daysUntil = calendarDaysUntil(due, now) ?? 10
      const echeanceLe = formatEcheanceDay(due)
      const numero = factureEcheanceNumero(subscription.id, due)
      const raisonSociale = subscription.user.raisonSociale?.trim() || email

      let pdf: Buffer
      try {
        pdf = await renderFactureEcheancePdf({
          numero,
          raisonSociale,
          email,
          siret: subscription.user.siret,
          adresse: subscription.user.adresse,
          codePostal: subscription.user.codePostal,
          ville: subscription.user.ville,
          label,
          amount,
          echeanceLe,
        })
      } catch (error) {
        pdfFailed++
        console.error("[cron relance-echeance-10-jours] pdf", subscription.id, error)
        continue
      }

      const template = EMAIL_TEMPLATES.relanceEcheanceDixJours(
        raisonSociale,
        label,
        amount,
        echeanceLe,
        numero,
        email,
        daysUntil
      )
      const emailOk = await sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: [{ filename: `facture-${numero}.pdf`, content: pdf }],
      })
      if (!emailOk) {
        emailFailed++
        continue
      }

      reminded++
      alreadySent.add(targetId)
      await logAdminActivity({
        adminEmail: "cron@system",
        action: REMINDER_ACTION,
        targetType: "sepa_subscription",
        targetId,
        details: {
          subscriptionId: subscription.id,
          userId: subscription.userId,
          email,
          amount,
          dueDay: parisCalendarDay(due),
          numero,
          label,
          daysUntil,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      scanned: subscriptions.length,
      due: dueSubscriptions.length,
      reminded,
      skippedAlreadySent,
      skippedNoEmail,
      skippedUnsubscribed,
      skippedNoAmount,
      pdfFailed,
      emailFailed,
    })
  } catch (error) {
    console.error("[cron relance-echeance-10-jours]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
