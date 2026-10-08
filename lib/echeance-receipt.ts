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

/** Reçu client à l'encaissement Mollie, avec copie sur info@ si l'adresse diffère. */
export async function sendEcheancePaidReceipt(params: {
  email: string
  raisonSociale: string
  metadata: Record<string, unknown>
  amount: number
}): Promise<void> {
  const email = params.email.trim()
  if (!email) return
  const label = echeanceReceiptLabel(params.metadata)
  const template = EMAIL_TEMPLATES.confirmationEcheancePayee(params.raisonSociale || email, label, params.amount)
  try {
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    if (!sent) {
      console.warn("[echeance] reçu non envoyé", { email, label })
    }
    if (!shouldCopyEcheanceReceipt(email)) return
    const copied = await sendEmail({
      to: DEFAULT_PUBLIC_CONTACT_EMAIL,
      subject: `[Copie] ${template.subject}`,
      text: `Copie du reçu envoyé à ${email}.\n\n${template.text}`,
      html: `<p>Copie du reçu envoyé à <strong>${escapeHtml(email)}</strong>.</p>${template.html}`,
    })
    if (!copied) {
      console.warn("[echeance] copie du reçu non envoyée", { email, label })
    }
  } catch (error) {
    console.warn("[echeance] envoi du reçu impossible", { email, label, error })
  }
}
