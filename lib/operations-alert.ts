import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { getDevisAlertRecipientEmails } from "@/lib/devis-alert"

type OperationsAlertParams = {
  subject: string
  lines: string[]
  replyTo?: string
}

/**
 * Alerte interne « exploitation » (rappels bloquants, impayés, signatures en attente, etc.).
 * Utilise les mêmes destinataires que les alertes devis.
 */
export async function sendOperationsAlert(params: OperationsAlertParams): Promise<boolean> {
  const recipients = getDevisAlertRecipientEmails()
  if (recipients.length === 0) {
    console.warn(
      "[operations-alert] Aucun destinataire — définissez DEVIS_ALERT_EMAILS, ADMIN_EMAILS, CONTACT_EMAIL ou NEXT_PUBLIC_EMAIL."
    )
    return false
  }

  const text = [
    "Alerte automatique Optimum Assurance",
    "",
    ...params.lines,
    "",
    "---",
    "Notification automatique (cron).",
  ].join("\n")

  const htmlLines = params.lines
    .map((line) => `<p style="margin:0 0 8px;color:#0f172a;">${escapeHtmlForEmail(line)}</p>`)
    .join("")
  const html = `
    <p style="font-weight:600;font-size:16px;margin:0 0 14px;color:#0f172a;">${escapeHtmlForEmail(
      params.subject
    )}</p>
    ${htmlLines}
    <p style="margin-top:18px;font-size:12px;color:#64748b;">Alerte opérationnelle envoyée automatiquement.</p>
  `.trim()

  const results = await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        subject: params.subject,
        text,
        html,
        ...(params.replyTo?.trim() ? { replyTo: params.replyTo.trim() } : {}),
      })
    )
  )

  return results.some(Boolean)
}
