import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { loadEcheancesASuivre } from "@/lib/client-echeance-service"
import { parisCalendarDay } from "@/lib/echeance-reminder"
import { getOwnerAlertEmail } from "@/lib/devis-alert"
import { lateInvoiceAlertMessage } from "@/lib/late-invoice-alert-copy"
import { SITE_URL } from "@/lib/site-url"

export const LATE_INVOICE_ALERT_ACTION = "cron_facture_en_retard_alert_sent"

/** Un seul e-mail par jour, à vous, quand des factures ont dépassé leur échéance. */
export async function sendLateInvoiceOwnerAlert(now = new Date()): Promise<{ sent: boolean; count: number }> {
  const rows = await loadEcheancesASuivre(now)
  if (rows.length === 0) return { sent: false, count: 0 }

  const day = parisCalendarDay(now)
  const targetId = `facture-en-retard:${day}`
  const existing = await prisma.adminActivityLog.findFirst({
    where: { action: LATE_INVOICE_ALERT_ACTION, targetType: "facture_en_retard", targetId },
    select: { id: true },
  })
  if (existing) return { sent: false, count: rows.length }

  const to = getOwnerAlertEmail()
  const message = lateInvoiceAlertMessage(rows, SITE_URL)
  const sent = await sendEmail({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
  if (!sent) return { sent: false, count: rows.length }

  await logAdminActivity({
    adminEmail: "cron@system",
    action: LATE_INVOICE_ALERT_ACTION,
    targetType: "facture_en_retard",
    targetId,
    details: { count: rows.length, to },
  })
  return { sent: true, count: rows.length }
}
