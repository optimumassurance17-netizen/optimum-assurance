import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { getDevisAlertRecipientEmails } from "@/lib/devis-alert"

type RcFabEmailCopyParams = {
  originalTo: string
  subject: string
  text: string
  html?: string
  contextLabel: string
}

/**
 * Envoie une copie interne des e-mails RC Fabriquant.
 * Non bloquant : les erreurs de copie sont loggées mais ne cassent pas le parcours client.
 */
export async function sendRcFabriquantEmailCopy(params: RcFabEmailCopyParams): Promise<boolean> {
  try {
    const originalTo = params.originalTo.trim().toLowerCase()
    if (!originalTo) return false

    const recipients = getDevisAlertRecipientEmails().filter((email) => email !== originalTo)
    if (recipients.length === 0) return false

    const subject = `[Copie RC Fabriquant] ${params.subject}`
    const text = [
      "Copie interne automatique — e-mail RC Fabriquant",
      "",
      `Contexte : ${params.contextLabel}`,
      `Destinataire client : ${originalTo}`,
      "",
      "--- Message envoyé au client ---",
      params.text,
    ].join("\n")

    const html = `
      <p style="font-weight:600;font-size:16px;margin:0 0 12px;color:#0f172a;">Copie interne automatique — RC Fabriquant</p>
      <p style="margin:0 0 8px;color:#0f172a;"><strong>Contexte :</strong> ${escapeHtmlForEmail(params.contextLabel)}</p>
      <p style="margin:0 0 12px;color:#0f172a;"><strong>Destinataire client :</strong> <a href="mailto:${escapeHtmlForEmail(
        originalTo
      )}" style="color:#2563eb;">${escapeHtmlForEmail(originalTo)}</a></p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;" />
      ${params.html ?? `<pre style="white-space:pre-wrap;color:#0f172a;">${escapeHtmlForEmail(params.text)}</pre>`}
    `.trim()

    const results = await Promise.all(
      recipients.map((to) =>
        sendEmail({
          to,
          subject,
          text,
          html,
        })
      )
    )
    return results.some(Boolean)
  } catch (error) {
    console.error("[rc-fabriquant-email-copy]", error)
    return false
  }
}
