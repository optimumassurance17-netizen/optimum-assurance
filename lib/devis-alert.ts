import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { doDevisLeadGestionUrl } from "@/lib/devis-do-lead"
import { DEFAULT_PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email"
import { SITE_URL } from "@/lib/site-url"

/**
 * Destinataire unique des alertes internes : info@optimum-assurance.eu.
 * Les réponses aux e-mails partent aussi sur cette adresse (reply-to dans sendEmail).
 */
export function getDevisAlertRecipientEmails(): string[] {
  return [DEFAULT_PUBLIC_CONTACT_EMAIL]
}

type DevisAlertType =
  | "decennale"
  | "dommage_ouvrage"
  | "rc_fabriquant"
  | "etude"
  | "assurance_titre"

/**
 * Envoie une alerte interne pour chaque nouvelle demande de devis (Resend).
 * Ne bloque pas le parcours visiteur si l’envoi échoue (log uniquement).
 */
export async function sendNewDevisRequestAlert(params: {
  type: DevisAlertType
  clientEmail: string
  lines: string[]
  gestionLeadId?: string
}): Promise<void> {
  const recipients = getDevisAlertRecipientEmails()

  const label =
    params.type === "decennale"
      ? "Décennale"
      : params.type === "dommage_ouvrage"
        ? "Dommage ouvrage"
        : params.type === "rc_fabriquant"
          ? "RC Fabriquant"
          : params.type === "assurance_titre"
            ? "Assurance titre"
            : "Étude personnalisée"
  const subject = `[Optimum] Nouvelle demande de devis — ${label}`
  const clientEmail = params.clientEmail.trim()
  const gestionUrl =
    params.type === "dommage_ouvrage" ? doDevisLeadGestionUrl(SITE_URL, params.gestionLeadId) : ""

  const textBody = [
    `Nouvelle demande de devis (${label}).`,
    "",
    `Email du prospect : ${clientEmail}`,
    "",
    ...params.lines,
    "",
    ...(gestionUrl ? [`Ouvrir la demande dans la gestion : ${gestionUrl}`, ""] : []),
    `Site : ${SITE_URL}`,
    "",
    "---",
    "Notification automatique — Optimum Assurance",
  ].join("\n")

  const htmlLines = params.lines
    .map((l) => `<p style="margin:0 0 8px;color:#0f172a;">${escapeHtmlForEmail(l)}</p>`)
    .join("")
  const gestionHtml = gestionUrl
    ? `<p style="margin:16px 0 0;"><a href="${escapeHtmlForEmail(gestionUrl)}" style="color:#2563eb;">Ouvrir la demande dans la gestion</a></p>`
    : ""
  const html = `<p style="font-weight:600;font-size:16px;margin:0 0 14px;color:#0f172a;">Nouvelle demande de devis — ${escapeHtmlForEmail(label)}</p>
<p style="margin:0 0 12px;"><strong>Email du prospect :</strong> <a href="mailto:${escapeHtmlForEmail(clientEmail)}" style="color:#2563eb;">${escapeHtmlForEmail(clientEmail)}</a></p>
${htmlLines}
${gestionHtml}
<p style="margin-top:18px;font-size:12px;color:#64748b;">Alerte reçue sur ${escapeHtmlForEmail(DEFAULT_PUBLIC_CONTACT_EMAIL)}. L'adresse du prospect est indiquée ci-dessus.</p>`.trim()

  const results = await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        subject,
        text: textBody,
        html,
      })
    )
  )
  if (!results.some(Boolean)) {
    console.warn("[devis-alert] Envoi interne KO pour tous les destinataires.")
  }
}

/**
 * Alerte interne lorsque le client enregistre le questionnaire d’étude DO (espace client).
 * Ne bloque pas le parcours si l’envoi échoue.
 */
export async function sendDoEtudeSavedAlert(params: {
  clientEmail: string
  souscripteurNom?: string
  chantierLieu?: string
  isUpdate: boolean
}): Promise<void> {
  const recipients = getDevisAlertRecipientEmails()

  const clientEmail = params.clientEmail.trim()
  const action = params.isUpdate ? "mis à jour" : "enregistré"
  const subject = `[Optimum] Questionnaire d’étude DO ${action}`
  const lines: string[] = [
    `Le client a ${action} son questionnaire d’étude dommage ouvrage depuis l’espace client.`,
    params.souscripteurNom ? `Souscripteur / raison sociale (formulaire) : ${params.souscripteurNom}` : "",
    params.chantierLieu ? `Chantier (ville) : ${params.chantierLieu}` : "",
    `Lien espace client : ${SITE_URL}/espace-client`,
    `Questionnaire : ${SITE_URL}/espace-client/questionnaire-do-etude`,
  ].filter(Boolean)

  const textBody = [
    `Questionnaire d’étude DO ${action}.`,
    "",
    `Email du client : ${clientEmail}`,
    "",
    ...lines,
    "",
    `Site : ${SITE_URL}`,
    "",
    "---",
    "Notification automatique — Optimum Assurance",
  ].join("\n")

  const htmlLines = lines
    .map((l) => `<p style="margin:0 0 8px;color:#0f172a;">${escapeHtmlForEmail(l)}</p>`)
    .join("")
  const html = `<p style="font-weight:600;font-size:16px;margin:0 0 14px;color:#0f172a;">Questionnaire d’étude DO — ${escapeHtmlForEmail(action)}</p>
<p style="margin:0 0 12px;"><strong>Email du client :</strong> <a href="mailto:${escapeHtmlForEmail(clientEmail)}" style="color:#2563eb;">${escapeHtmlForEmail(clientEmail)}</a></p>
${htmlLines}
<p style="margin-top:18px;font-size:12px;color:#64748b;">Alerte reçue sur ${escapeHtmlForEmail(DEFAULT_PUBLIC_CONTACT_EMAIL)}. L'adresse du client est indiquée ci-dessus.</p>`.trim()

  const results = await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        subject,
        text: textBody,
        html,
      })
    )
  )
  if (!results.some(Boolean)) {
    console.warn("[devis-alert] DO étude: envoi interne KO pour tous les destinataires.")
  }
}

/**
 * Alerte interne lorsque le client enregistre / met à jour son questionnaire d’étude Assurance titre.
 */
export async function sendAssuranceTitreEtudeSavedAlert(params: {
  clientEmail: string
  contactName?: string
  assetCity?: string
  isUpdate: boolean
}): Promise<void> {
  const recipients = getDevisAlertRecipientEmails()

  const clientEmail = params.clientEmail.trim()
  const action = params.isUpdate ? "mis à jour" : "enregistré"
  const subject = `[Optimum] Questionnaire d’étude Assurance titre ${action}`
  const lines: string[] = [
    `Le client a ${action} son questionnaire d’étude Assurance titre depuis l’espace client.`,
    params.contactName ? `Contact / dossier : ${params.contactName}` : "",
    params.assetCity ? `Bien (ville) : ${params.assetCity}` : "",
    `Lien espace client : ${SITE_URL}/espace-client`,
    `Questionnaire : ${SITE_URL}/espace-client/assurance-titre`,
  ].filter(Boolean)

  const textBody = [
    `Questionnaire d’étude Assurance titre ${action}.`,
    "",
    `Email du client : ${clientEmail}`,
    "",
    ...lines,
    "",
    `Site : ${SITE_URL}`,
    "",
    "---",
    "Notification automatique — Optimum Assurance",
  ].join("\n")

  const htmlLines = lines
    .map((line) => `<p style="margin:0 0 8px;color:#0f172a;">${escapeHtmlForEmail(line)}</p>`)
    .join("")
  const html = `<p style="font-weight:600;font-size:16px;margin:0 0 14px;color:#0f172a;">Questionnaire d’étude Assurance titre — ${escapeHtmlForEmail(action)}</p>
<p style="margin:0 0 12px;"><strong>Email du client :</strong> <a href="mailto:${escapeHtmlForEmail(clientEmail)}" style="color:#2563eb;">${escapeHtmlForEmail(clientEmail)}</a></p>
${htmlLines}
<p style="margin-top:18px;font-size:12px;color:#64748b;">Alerte reçue sur ${escapeHtmlForEmail(DEFAULT_PUBLIC_CONTACT_EMAIL)}. L'adresse du client est indiquée ci-dessus.</p>`.trim()

  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        subject,
        text: textBody,
        html,
      })
    )
  )
}
