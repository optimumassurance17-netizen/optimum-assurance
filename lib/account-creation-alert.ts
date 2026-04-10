import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { getDevisAlertRecipientEmails } from "@/lib/devis-alert"
import { SITE_URL } from "@/lib/site-url"

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
 * Alerte interne sur création de compte avec résumé.
 * Non bloquant : si l'email interne échoue, le parcours utilisateur continue.
 */
export async function sendAccountCreationSummaryAlert(
  payload: AccountCreationAlertPayload
): Promise<boolean> {
  try {
    const recipients = getDevisAlertRecipientEmails()
    if (recipients.length === 0) return false

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
    console.error("[account-creation-alert]", error)
    return false
  }
}
