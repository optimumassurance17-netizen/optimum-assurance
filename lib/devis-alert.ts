import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { SITE_URL } from "@/lib/site-url"

/**
 * Destinataires des alertes « nouvelle demande de devis ».
 * Priorité : DEVIS_ALERT_EMAILS (liste séparée par virgules) → sinon ADMIN_EMAILS → CONTACT_EMAIL → NEXT_PUBLIC_EMAIL.
 */
export function getDevisAlertRecipientEmails(): string[] {
  const primary = process.env.DEVIS_ALERT_EMAILS?.trim()
  const fallback =
    process.env.ADMIN_EMAILS?.trim() ||
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_EMAIL?.trim() ||
    ""
  const raw = primary || fallback
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(",")) {
    const e = part.trim().toLowerCase()
    if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !seen.has(e)) {
      seen.add(e)
      out.push(e)
    }
  }
  return out
}

type DevisAlertType = "decennale" | "dommage_ouvrage"

/**
 * Envoie une alerte interne pour chaque nouvelle demande de devis (Resend).
 * Ne bloque pas le parcours visiteur si l’envoi échoue (log uniquement).
 */
export async function sendNewDevisRequestAlert(params: {
  type: DevisAlertType
  clientEmail: string
  lines: string[]
}): Promise<void> {
  const recipients = getDevisAlertRecipientEmails()
  if (recipients.length === 0) {
    console.warn(
      "[devis-alert] Aucun destinataire — définissez DEVIS_ALERT_EMAILS, ADMIN_EMAILS, CONTACT_EMAIL ou NEXT_PUBLIC_EMAIL."
    )
    return
  }

  const label = params.type === "decennale" ? "Décennale" : "Dommage ouvrage"
  const subject = `[Optimum] Nouvelle demande de devis — ${label}`
  const clientEmail = params.clientEmail.trim()

  const textBody = [
    `Nouvelle demande de devis (${label}).`,
    "",
    `Email du prospect : ${clientEmail}`,
    "",
    ...params.lines,
    "",
    `Site : ${SITE_URL}`,
    "",
    "---",
    "Notification automatique — Optimum Assurance",
  ].join("\n")

  const htmlLines = params.lines
    .map((l) => `<p style="margin:0 0 8px;color:#0f172a;">${escapeHtmlForEmail(l)}</p>`)
    .join("")
  const html = `<p style="font-weight:600;font-size:16px;margin:0 0 14px;color:#0f172a;">Nouvelle demande de devis — ${escapeHtmlForEmail(label)}</p>
<p style="margin:0 0 12px;"><strong>Email du prospect :</strong> <a href="mailto:${escapeHtmlForEmail(clientEmail)}" style="color:#2563eb;">${escapeHtmlForEmail(clientEmail)}</a></p>
${htmlLines}
<p style="margin-top:18px;font-size:12px;color:#64748b;">Répondre à ce message pour écrire directement au prospect (Reply-To).</p>`.trim()

  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        replyTo: clientEmail,
        subject,
        text: textBody,
        html,
      })
    )
  )
}
