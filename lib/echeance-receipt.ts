import { echeanceReceiptLabel } from "@/lib/client-echeances"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { DEFAULT_PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function shouldCopyEcheanceReceipt(clientEmail: string): boolean {
  return clientEmail.trim().toLowerCase() !== DEFAULT_PUBLIC_CONTACT_EMAIL.toLowerCase()
}

/** Information au client : le prélèvement SEPA n'a pas abouti. Aucun paiement n'est créé. */
export async function sendSepaFailureNotice(params: {
  email: string
  raisonSociale: string
  label: string
  reason: string
  espaceUrl: string
}): Promise<boolean> {
  const email = params.email.trim()
  if (!email) return false
  const template = EMAIL_TEMPLATES.informationRefusSepa(
    params.raisonSociale || email,
    params.label,
    params.reason,
    params.espaceUrl,
    email
  )
  try {
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    if (!sent) {
      console.warn("[echeance] information de refus SEPA non envoyée", { email, label: params.label })
      return false
    }
    if (!shouldCopyEcheanceReceipt(email)) return true
    const copied = await sendEmail({
      to: DEFAULT_PUBLIC_CONTACT_EMAIL,
      subject: `[Copie] ${template.subject}`,
      text: `Copie de l'information envoyée à ${email}.\n\n${template.text}`,
      html: `<p>Copie de l'information envoyée à <strong>${escapeHtml(email)}</strong>.</p>${template.html}`,
    })
    if (!copied) {
      console.warn("[echeance] copie de l'information de refus SEPA non envoyée", { email, label: params.label })
    }
    return true
  } catch (error) {
    console.warn("[echeance] envoi de l'information de refus SEPA impossible", { email, error })
    return false
  }
}

/** Reçu client à l'encaissement, avec copie sur info@ si l'adresse diffère. */
export async function sendEcheancePaidReceipt(params: {
  email: string
  raisonSociale: string
  metadata: Record<string, unknown>
  amount: number
}): Promise<boolean> {
  const email = params.email.trim()
  if (!email) return false
  const label = echeanceReceiptLabel(params.metadata)
  const mode = params.metadata.type === "virement_externe" ? "virement" : undefined
  const template = EMAIL_TEMPLATES.confirmationEcheancePayee(params.raisonSociale || email, label, params.amount, mode)
  try {
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    if (!sent) {
      console.warn("[echeance] reçu non envoyé", { email, label })
      return false
    }
    if (!shouldCopyEcheanceReceipt(email)) return true
    const copied = await sendEmail({
      to: DEFAULT_PUBLIC_CONTACT_EMAIL,
      subject: `[Copie] ${template.subject}`,
      text: `Copie du reçu envoyé à ${email}.\n\n${template.text}`,
      html: `<p>Copie du reçu envoyé à <strong>${escapeHtml(email)}</strong>.</p>${template.html}`,
    })
    if (!copied) {
      console.warn("[echeance] copie du reçu non envoyée", { email, label })
    }
    return true
  } catch (error) {
    console.warn("[echeance] envoi du reçu impossible", { email, label, error })
    return false
  }
}
