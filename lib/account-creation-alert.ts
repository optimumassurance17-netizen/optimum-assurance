import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { DEFAULT_PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email"
import { SITE_URL } from "@/lib/site-url"

/** Boîte qui reçoit l'alerte et la copie du mail de création de compte. */
export const ACCOUNT_CREATION_INBOX = DEFAULT_PUBLIC_CONTACT_EMAIL

type AccountCreationAlertSource = "register_public" | "admin_create_from_lead"

export type AccountCreationAlertPayload = {
  source: AccountCreationAlertSource
  user: {
    id: string
    email: string
    raisonSociale?: string | null
    siret?: string | null
    telephone?: string | null
  }
  leadType?: string | null
  leadId?: string | null
  createdBy?: string | null
  extraSummaryLines?: string[]
}

function sourceLabel(source: AccountCreationAlertSource): string {
  return source === "admin_create_from_lead"
    ? "Création dashboard (depuis lead)"
    : "Inscription publique (formulaire)"
}

/**
 * Copie interne du mail envoyé au client lors de la création de compte.
 * Ignorée si le client est déjà la boîte info@.
 */
export async function sendAccountCreationMailCopy(params: {
  clientEmail: string
  subject: string
  text: string
  html?: string
}): Promise<boolean> {
  const clientEmail = params.clientEmail.trim().toLowerCase()
  if (!clientEmail || clientEmail === ACCOUNT_CREATION_INBOX) return true

  const subject = `[Création compte] ${params.subject}`
  const text = [
    "Copie interne — e-mail de création de compte",
    "",
    `Destinataire client : ${clientEmail}`,
    "",
    "--- Message envoyé au client ---",
    params.text,
  ].join("\n")
  const html = `
    <p style="font-weight:600;font-size:16px;margin:0 0 12px;color:#0f172a;">Copie interne — création de compte</p>
    <p style="margin:0 0 12px;color:#0f172a;"><strong>Destinataire client :</strong> ${escapeHtmlForEmail(clientEmail)}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;" />
    ${params.html ?? `<pre style="white-space:pre-wrap;color:#0f172a;">${escapeHtmlForEmail(params.text)}</pre>`}
  `.trim()

  try {
    return await sendEmail({
      to: ACCOUNT_CREATION_INBOX,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error("[account-creation-mail-copy]", error)
    return false
  }
}

/**
 * Alerte interne sur création de compte avec résumé.
 * Envoyée à info@optimum-assurance.eu. Non bloquant si l'envoi échoue.
 */
export async function sendAccountCreationSummaryAlert(
  payload: AccountCreationAlertPayload
): Promise<boolean> {
  try {
    const summaryLines = [
      `Source : ${sourceLabel(payload.source)}`,
      `Utilisateur : ${payload.user.email}`,
      `Raison sociale : ${payload.user.raisonSociale?.trim() || "—"}`,
      `SIRET : ${payload.user.siret?.trim() || "—"}`,
      `Téléphone : ${payload.user.telephone?.trim() || "—"}`,
      `User ID : ${payload.user.id}`,
      `Lead type : ${payload.leadType?.trim() || "—"}`,
      `Lead ID : ${payload.leadId?.trim() || "—"}`,
      `Créé par : ${payload.createdBy?.trim() || "self-service"}`,
      `Espace client : ${SITE_URL}/connexion`,
      ...((payload.extraSummaryLines ?? []).map((line) => line.trim()).filter(Boolean)),
    ]

    const subject = `[Optimum] Nouveau compte créé — ${payload.user.email}`
    const text = [
      "Alerte automatique — création de compte",
      "",
      ...summaryLines,
      "",
      "---",
      "Résumé envoyé automatiquement.",
    ].join("\n")

    const html = `
      <p style="font-weight:600;font-size:16px;margin:0 0 14px;color:#0f172a;">Nouveau compte créé</p>
      ${summaryLines
        .map((line) => {
          const [label, ...rest] = line.split(":")
          const value = rest.join(":").trim()
          return `<p style="margin:0 0 8px;color:#0f172a;"><strong>${escapeHtmlForEmail(
            label
          )} :</strong> ${escapeHtmlForEmail(value || "—")}</p>`
        })
        .join("")}
      <p style="margin-top:18px;font-size:12px;color:#64748b;">Résumé automatique de création de compte.</p>
    `.trim()

    return await sendEmail({
      to: ACCOUNT_CREATION_INBOX,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error("[account-creation-alert]", error)
    return false
  }
}
