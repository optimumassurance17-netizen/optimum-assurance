/**
 * Structure d'envoi d'emails
 * Utilise Resend (RESEND_API_KEY) ou autre fournisseur
 */

import { SITE_URL as APP_URL } from "@/lib/site-url"
import {
  appendTransactionalEmailTextFooter,
  wrapTransactionalEmailHtml,
} from "@/lib/email-layout"
import { buildReminderUnsubscribeUrl, type ReminderUnsubscribeType } from "@/lib/reminder-unsubscribe"

const FROM = process.env.EMAIL_FROM || "Optimum Assurance <noreply@optimum-assurance.fr>"

function escapeHtmlForEmail(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function reminderUnsubscribeTextFooter(
  type: ReminderUnsubscribeType,
  email: string
): string {
  const url = buildReminderUnsubscribeUrl(type, email)
  return `\n\n—\nSe désabonner de ces relances : ${url}`
}

function reminderUnsubscribeHtmlFooter(
  type: ReminderUnsubscribeType,
  email: string
): string {
  const url = buildReminderUnsubscribeUrl(type, email)
  return `<p style="font-size:12px;color:#64748b;margin-top:16px;">Vous ne souhaitez plus recevoir ces relances ? <a href="${url}" style="color:#2563eb;">Se désabonner</a>.</p>`
}

export async function sendEmail(params: {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: Array<{ filename: string; content: Buffer | string }>
  /** Réponse directe au visiteur (ex. formulaire contact). API Resend : reply_to */
  replyTo?: string
  /** Désactive logo + pied de page (cas exceptionnels). */
  skipBranding?: boolean
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("RESEND_API_KEY non configuré - email non envoyé")
    return false
  }

  const htmlOut =
    params.html && !params.skipBranding
      ? wrapTransactionalEmailHtml(params.html)
      : params.html
  const textOut = params.skipBranding ? params.text : appendTransactionalEmailTextFooter(params.text)

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: params.to,
      subject: params.subject,
      text: textOut,
      ...(htmlOut && { html: htmlOut }),
      ...(params.replyTo?.trim() && { reply_to: params.replyTo.trim() }),
      ...(params.attachments &&
        params.attachments.length > 0 && {
          attachments: params.attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
          })),
        }),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    try {
      console.error("Resend API:", res.status, JSON.parse(text))
    } catch {
      console.error("Resend API:", res.status, text)
    }
  }

  return res.ok
}

export const EMAIL_TEMPLATES = {
  /** Devis / proposition PDF uploadé par la gestion — signature puis paiement depuis l’espace client. */
  invitationSignatureDevisPersonnalise: (
    raisonSociale: string,
    signatureLink: string,
    opts?: { produitLabel?: string; montantTtc?: number; reference?: string }
  ) => {
    const ref = opts?.reference?.trim()
    const label = opts?.produitLabel?.trim() || "Proposition commerciale"
    const montant =
      opts?.montantTtc != null && opts.montantTtc > 0
        ? `Montant TTC indiqué : ${opts.montantTtc.toLocaleString("fr-FR")} €\n\n`
        : ""
    const refLine = ref ? `Référence dossier : ${ref}\n\n` : ""
    const safeLabel = escapeHtmlForEmail(label)
    const safeRef = ref ? escapeHtmlForEmail(ref) : ""
    const safeName = escapeHtmlForEmail(raisonSociale)
    return {
      subject: `${label} — signature électronique — Optimum Assurance`,
      text: `Bonjour ${raisonSociale},\n\nVeuillez signer électroniquement le document qui vous a été préparé (${label}).\n\n${refLine}${montant}Lien sécurisé :\n${signatureLink}\n\nAprès signature, votre dossier sera disponible dans votre espace client ${APP_URL}/espace-client pour le règlement (virement bancaire sécurisé), sauf instructions contraires de votre conseiller.\n\nCordialement,\nOptimum Assurance`,
      html: `<p>Bonjour ${safeName},</p><p>Veuillez <strong>signer électroniquement</strong> le document qui vous a été préparé — <strong>${safeLabel}</strong>.</p>${ref ? `<p style="font-size:13px;color:#64748b;">Référence dossier : <strong>${safeRef}</strong></p>` : ""}${opts?.montantTtc != null && opts.montantTtc > 0 ? `<p><strong>Montant TTC indiqué :</strong> ${opts.montantTtc.toLocaleString("fr-FR")} €</p>` : ""}<p><a href="${signatureLink}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Signer le document</a></p><p style="font-size:13px;color:#64748b;">Après signature : connectez-vous à votre <a href="${APP_URL}/espace-client" style="color:#2563eb;font-weight:bold">espace client</a> pour le <strong>règlement</strong> (virement bancaire sécurisé), sauf instructions contraires de votre conseiller.</p><p>Cordialement,<br>Optimum Assurance</p>`,
    }
  },
  invitationSignatureDecennale: (raisonSociale: string, signatureLink: string, devisNumero: string) => ({
    subject: `Signature de votre contrat décennale — devis ${devisNumero} - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nVotre contrat d’assurance décennale est prêt à être signé électroniquement.\n\nLien de signature :\n${signatureLink}\n\nRéférence devis : ${devisNumero}\n\nAprès signature : connectez-vous sur ${APP_URL} avec votre compte, puis ouvrez la page Mandat SEPA (${APP_URL}/mandat-sepa) pour l’IBAN et le 1er trimestre par carte (Mollie). Les échéances suivantes : prélèvements SEPA trimestriels automatiques (reconduction annuelle).\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre <strong>contrat d’assurance décennale</strong> est prêt à être signé électroniquement.</p><p><a href="${signatureLink}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Signer le contrat</a></p><p style="font-size:13px;color:#64748b;">Référence devis : <strong>${devisNumero}</strong></p><p style="font-size:13px;color:#64748b;"><strong>Après signature</strong> : connectez-vous, puis <strong>Mandat SEPA</strong> — IBAN puis <strong>1er trimestre par carte</strong> (Mollie) ; ensuite prélèvements SEPA trimestriels automatiques (reconduction annuelle).</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  rappelSignatureEnAttente: (
    raisonSociale: string,
    signatureLink: string,
    recipientEmail: string,
    opts?: { produitLabel?: string; reference?: string }
  ) => {
    const produit = opts?.produitLabel?.trim() || "votre document"
    const ref = opts?.reference?.trim()
    const refText = ref ? `\nRéférence : ${ref}` : ""
    const refHtml = ref
      ? `<p style="font-size:13px;color:#64748b;margin:8px 0 0;">Référence : <strong>${escapeHtmlForEmail(ref)}</strong></p>`
      : ""
    return {
      subject: `Rappel signature électronique — ${produit} - Optimum Assurance`,
      text:
        `Bonjour ${raisonSociale},\n\nNous vous rappelons que la signature électronique de ${produit} est toujours en attente.${refText}\n\nLien sécurisé :\n${signatureLink}\n\nAprès signature, votre dossier continue automatiquement son traitement.\n\nCordialement,\nOptimum Assurance` +
        reminderUnsubscribeTextFooter("signature", recipientEmail),
      html:
        `<p>Bonjour ${escapeHtmlForEmail(raisonSociale)},</p><p>Nous vous rappelons que la <strong>signature électronique</strong> de <strong>${escapeHtmlForEmail(produit)}</strong> est toujours en attente.</p>${refHtml}<p><a href="${signatureLink}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Signer maintenant</a></p><p style="font-size:13px;color:#64748b;">Après signature, votre dossier continue automatiquement son traitement.</p><p>Cordialement,<br>Optimum Assurance</p>` +
        reminderUnsubscribeHtmlFooter("signature", recipientEmail),
    }
  },
  rappelPaiementContrat: (
    raisonSociale: string,
    produitLabel: string,
    montant: number,
    espaceClientUrl: string,
    recipientEmail: string,
    opts?: { reference?: string }
  ) => {
    const ref = opts?.reference?.trim()
    const refText = ref ? `\nRéférence contrat : ${ref}` : ""
    const refHtml = ref
      ? `<p style="font-size:13px;color:#64748b;margin:8px 0 0;">Référence contrat : <strong>${escapeHtmlForEmail(ref)}</strong></p>`
      : ""
    return {
      subject: `Rappel paiement ${produitLabel} - Optimum Assurance`,
      text:
        `Bonjour ${raisonSociale},\n\nVotre dossier ${produitLabel} est prêt, mais le paiement reste en attente.${refText}\n\nMontant attendu : ${montant.toLocaleString("fr-FR")} €\n\nAccédez à votre espace client pour finaliser le règlement :\n${espaceClientUrl}\n\nCordialement,\nOptimum Assurance` +
        reminderUnsubscribeTextFooter("paiement", recipientEmail),
      html:
        `<p>Bonjour ${escapeHtmlForEmail(raisonSociale)},</p><p>Votre dossier <strong>${escapeHtmlForEmail(produitLabel)}</strong> est prêt, mais le paiement reste en attente.</p>${refHtml}<p><strong>Montant attendu :</strong> ${montant.toLocaleString("fr-FR")} €</p><p><a href="${espaceClientUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accéder à mon espace client</a></p><p>Cordialement,<br>Optimum Assurance</p>` +
        reminderUnsubscribeHtmlFooter("paiement", recipientEmail),
    }
  },
  motDePasseReinitialisation: (resetUrl: string) => ({
    subject: "Réinitialisation de votre mot de passe - Optimum Assurance",
    text: `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\nOuvrez ce lien (valable 1 heure) :\n${resetUrl}\n\nSi vous n'avez pas fait cette demande, ignorez cet email.\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour,</p><p>Vous avez demandé la réinitialisation de votre mot de passe.</p><p><a href="${resetUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Réinitialiser mon mot de passe</a></p><p style="font-size:13px;color:#64748b;margin-top:16px;">Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez cet email.</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  confirmationSouscription: (raisonSociale: string) => ({
    subject: "Souscription confirmée - Optimum Assurance",
    text: `Bonjour ${raisonSociale},\n\nVotre assurance décennale a été souscrite avec succès.\n\nAccédez à votre espace client pour télécharger votre attestation : ${APP_URL}/espace-client\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre assurance décennale a été souscrite avec succès.</p><p><a href="${APP_URL}/espace-client" style="color:#2563eb;font-weight:bold">Accéder à mon espace client</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  rappelRenouvellement: (raisonSociale: string, dateEcheance: string) => ({
    subject: "Rappel : échéance de votre assurance décennale",
    text: `Bonjour ${raisonSociale},\n\nVotre attestation arrive à échéance le ${dateEcheance}.\n\nPensez à renouveler votre contrat pour rester couvert.\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre attestation arrive à échéance le <strong>${dateEcheance}</strong>.</p><p>Pensez à renouveler votre contrat pour rester couvert.</p><p><a href="${APP_URL}/devis" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Renouveler mon assurance</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  rappelRenouvellementAvecDesabonnement: (
    raisonSociale: string,
    dateEcheance: string,
    recipientEmail: string
  ) => ({
    subject: "Rappel : échéance de votre assurance décennale",
    text:
      `Bonjour ${raisonSociale},\n\nVotre attestation arrive à échéance le ${dateEcheance}.\n\nPensez à renouveler votre contrat pour rester couvert.\n\nCordialement,\nOptimum Assurance` +
      reminderUnsubscribeTextFooter("renouvellement", recipientEmail),
    html:
      `<p>Bonjour ${raisonSociale},</p><p>Votre attestation arrive à échéance le <strong>${dateEcheance}</strong>.</p><p>Pensez à renouveler votre contrat pour rester couvert.</p><p><a href="${APP_URL}/devis" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Renouveler mon assurance</a></p><p>Cordialement,<br>Optimum Assurance</p>` +
      reminderUnsubscribeHtmlFooter("renouvellement", recipientEmail),
  }),
  /** Décennale uniquement (échéances / SEPA). Le DO est réglé en une fois avant l’attestation. */
  alerteImpaye: (raisonSociale: string) => ({
    subject: "Régularisation — assurance décennale - Optimum Assurance",
    text: `Bonjour ${raisonSociale},\n\nVotre attestation d’assurance décennale a été suspendue pour défaut de paiement.\n\nRégularisez en ligne par carte bancaire : ${APP_URL}/espace-client/regularisation\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre <strong>attestation d’assurance décennale</strong> a été suspendue pour défaut de paiement.</p><p><a href="${APP_URL}/espace-client/regularisation" style="color:#2563eb;font-weight:bold">Régulariser mon paiement par CB</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  rappelDevisAbandonne: (
    raisonSociale: string,
    recipientEmail: string,
    primeAnnuelle?: number
  ) => ({
    subject: "Votre devis assurance décennale vous attend - Optimum Assurance",
    text:
      `Bonjour ${raisonSociale},\n\nVous avez demandé un devis assurance décennale. La prime annuelle était de ${primeAnnuelle ? primeAnnuelle.toLocaleString("fr-FR") + " €" : "disponible"}.\n\nFinalisez votre souscription en ligne : ${APP_URL}/devis\n\nCordialement,\nOptimum Assurance` +
      reminderUnsubscribeTextFooter("devis", recipientEmail),
    html:
      `<p>Bonjour ${raisonSociale},</p><p>Vous avez demandé un devis assurance décennale. La prime annuelle était de <strong>${primeAnnuelle ? primeAnnuelle.toLocaleString("fr-FR") + " €" : "disponible"}</strong>.</p><p><a href="${APP_URL}/devis" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Finaliser mon devis</a></p><p>Cordialement,<br>Optimum Assurance</p>` +
      reminderUnsubscribeHtmlFooter("devis", recipientEmail),
  }),
  rappelDossierIncomplet: (
    raisonSociale: string,
    espaceClientUrl: string,
    recipientEmail: string,
    opts?: { produitLabel?: string; reference?: string }
  ) => {
    const produit = opts?.produitLabel?.trim() || "votre dossier"
    const reference = opts?.reference?.trim()
    const refTxt = reference ? `\nRéférence : ${reference}` : ""
    const refHtml = reference
      ? `<p style="font-size:13px;color:#64748b;margin:8px 0 0;">Référence : <strong>${escapeHtmlForEmail(reference)}</strong></p>`
      : ""
    return {
      subject: `Action requise : dossier incomplet (${produit}) - Optimum Assurance`,
      text:
        `Bonjour ${raisonSociale},\n\nVotre dossier ${produit} est en attente car certaines étapes ne sont pas terminées (signature, pièces ou paiement).${refTxt}\n\nFinalisez votre dossier depuis votre espace client :\n${espaceClientUrl}\n\nSi vous avez besoin d’aide, répondez directement à cet e-mail.\n\nCordialement,\nOptimum Assurance` +
        reminderUnsubscribeTextFooter("dossier", recipientEmail),
      html:
        `<p>Bonjour ${escapeHtmlForEmail(raisonSociale)},</p><p>Votre dossier <strong>${escapeHtmlForEmail(produit)}</strong> est en attente car certaines étapes ne sont pas terminées (signature, pièces ou paiement).</p>${refHtml}<p><a href="${espaceClientUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Finaliser mon dossier</a></p><p style="font-size:13px;color:#64748b;">Besoin d’aide ? Répondez directement à cet e-mail.</p><p>Cordialement,<br>Optimum Assurance</p>` +
        reminderUnsubscribeHtmlFooter("dossier", recipientEmail),
    }
  },
  bienvenue: (raisonSociale: string) => ({
    subject: "Bienvenue chez Optimum Assurance",
    text: `Bonjour ${raisonSociale},\n\nVotre compte a été créé avec succès.\n\nConnectez-vous à votre espace client pour gérer vos documents et votre assurance décennale : ${APP_URL}/espace-client\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre compte a été créé avec succès.</p><p><a href="${APP_URL}/connexion" style="color:#2563eb;font-weight:bold">Se connecter à mon espace client</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  confirmationPaiementDo: (raisonSociale: string, numero: string, montant: number) => ({
    subject: `Paiement confirmé - Devis dommage ouvrage ${numero} - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nVotre virement de ${montant.toLocaleString("fr-FR")} € (Mollie) pour le devis dommage ouvrage ${numero} a bien été enregistré.\n\nVotre attestation DO et votre facture acquittée sont dans votre espace client. L'attestation comporte un QR code de vérification. Validité 10 ans, non résiliable.\n\n${APP_URL}/espace-client\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre <strong>virement</strong> de <strong>${montant.toLocaleString("fr-FR")} €</strong> (Mollie) pour le devis dommage ouvrage ${numero} a bien été enregistré.</p><p>Votre attestation DO et votre facture acquittée sont dans votre espace client. QR code sur l’attestation. Validité 10 ans, non résiliable.</p><p><a href="${APP_URL}/espace-client" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accéder à mon espace client</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  /** Décennale — 1er trimestre CB (distinct du DO). Pièce jointe : facture FAC-DEC. */
  confirmationPaiementDecennalePremierTrimestre: (
    raisonSociale: string,
    numeroFacture: string,
    montant: number
  ) => ({
    subject: `Paiement reçu — 1er trimestre décennale (${numeroFacture}) - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nNous avons bien enregistré votre paiement de ${montant.toLocaleString("fr-FR")} € (Mollie) pour le premier trimestre de votre assurance décennale.\n\nVotre facture acquittée ${numeroFacture} est jointe à cet email et disponible dans votre espace client.\n\n${APP_URL}/espace-client\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Nous avons bien enregistré votre <strong>paiement par carte</strong> de <strong>${montant.toLocaleString("fr-FR")} €</strong> (Mollie) pour le <strong>premier trimestre</strong> de votre assurance décennale.</p><p>Votre <strong>facture acquittée ${numeroFacture}</strong> est jointe à cet email et disponible dans votre espace client.</p><p><a href="${APP_URL}/espace-client" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accéder à mon espace client</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  devisDoAjoute: (raisonSociale: string, numero: string, primeAnnuelle: number) => ({
    subject: `Votre devis dommage ouvrage ${numero} est disponible - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nVotre devis dommage ouvrage a été ajouté à votre espace client.\n\nRéférence : ${numero}\nPrime annuelle : ${primeAnnuelle.toLocaleString("fr-FR")} €\n\nRèglement : uniquement par virement bancaire via Mollie (instructions sur la page de paiement). Attestation délivrée après encaissement.\n\n${APP_URL}/espace-client\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre devis dommage ouvrage a été ajouté à votre espace client.</p><p><strong>Référence :</strong> ${numero}<br><strong>Prime annuelle :</strong> ${primeAnnuelle.toLocaleString("fr-FR")} €</p><p><a href="${APP_URL}/espace-client" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accéder à mon espace client</a></p><p>Règlement : <strong>uniquement virement bancaire (Mollie)</strong> — coordonnées et référence sur la page sécurisée. Attestation après réception du virement.</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  devisSauvegarde: (email: string, resumeUrl: string, opts?: { pdfJoint?: boolean }) => {
    const pdfLine = opts?.pdfJoint
      ? "\n\nVotre devis (PDF) est joint à ce message."
      : ""
    const pdfHtml = opts?.pdfJoint
      ? "<p>Votre <strong>devis au format PDF</strong> est joint à ce message.</p>"
      : ""
    return {
      subject: "Reprendre votre devis - Optimum Assurance",
      text: `Bonjour,\n\nVous avez sauvegardé votre devis en cours. Cliquez sur le lien ci-dessous pour le reprendre :\n\n${resumeUrl}\n\nCe lien est valable 7 jours.${pdfLine}\n\nCordialement,\nOptimum Assurance`,
      html: `<p>Bonjour,</p>${pdfHtml}<p>Vous avez sauvegardé votre devis en cours. Cliquez sur le lien ci-dessous pour le reprendre :</p><p><a href="${resumeUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reprendre mon devis</a></p><p>Ce lien est valable 7 jours.</p><p>Cordialement,<br>Optimum Assurance</p>`,
    }
  },
  devisDoEstimationJointe: (raisonSociale: string, numeroReference: string) => ({
    subject: `Votre estimation dommage ouvrage ${numeroReference} - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nNous avons bien enregistré votre demande de devis dommage ouvrage. Vous trouverez en pièce jointe une estimation indicative (PDF), sous réserve d’étude de votre dossier.\n\nUn conseiller peut vous confirmer le montant définitif sous 24 h ouvrées.\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Nous avons bien enregistré votre <strong>demande de devis dommage ouvrage</strong>. Vous trouverez en pièce jointe une <strong>estimation indicative</strong> (PDF), sous réserve d’étude de votre dossier.</p><p>Un conseiller peut vous confirmer le montant définitif sous <strong>24 h ouvrées</strong>.</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  /** RC Fabriquant — pas de PDF automatique ; étude par un conseiller. */
  demandeRcFabriquantRecue: (raisonSociale: string) => ({
    subject: "Demande de devis RC Fabriquant bien reçue - Optimum Assurance",
    text: `Bonjour ${raisonSociale},\n\nNous avons bien enregistré votre demande de devis pour une assurance Responsabilité Civile Fabriquant.\n\nUn conseiller étudiera votre dossier (activité, zones de commercialisation, chiffre d’affaires) et vous recontacte en général sous 24 à 48 h ouvrées avec une proposition adaptée.\n\nPour toute précision : répondez à cet email ou écrivez-nous via ${APP_URL}/contact\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Nous avons bien enregistré votre demande de devis pour une assurance <strong>Responsabilité Civile Fabriquant</strong>.</p><p>Un conseiller étudiera votre dossier (activité, zones de commercialisation, chiffre d’affaires) et vous recontacte en général sous <strong>24 à 48 h ouvrées</strong> avec une proposition adaptée.</p><p>Pour toute précision : répondez à cet email ou utilisez notre <a href="${APP_URL}/contact" style="color:#2563eb;font-weight:bold">formulaire de contact</a>.</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  /**
   * Proposition métier après étude (RC Fabriquant) — message rédigé par l’admin, envoyé au prospect.
   * La prime éventuelle est indicative ; pas de souscription en ligne sur ce produit.
   */
  propositionRcFabriquant: (
    raisonSociale: string,
    messagePlain: string,
    primeAnnuelle?: number,
    opts?: {
      espaceClient?: {
        mode: "existing" | "created"
        email: string
        tempPassword?: string
      }
    }
  ) => {
    const primeTxt =
      primeAnnuelle != null && primeAnnuelle > 0
        ? `Indication de prime annuelle proposée : ${primeAnnuelle.toLocaleString("fr-FR")} € TTC (sous réserve de validation définitive du dossier et des conditions générales).\n\n`
        : ""
    const primeHtml =
      primeAnnuelle != null && primeAnnuelle > 0
        ? `<p style="margin:16px 0;padding:12px 16px;background:#f0fdfa;border-radius:8px;border:1px solid #99f6e4;"><strong>Indication de prime annuelle proposée :</strong> ${primeAnnuelle.toLocaleString("fr-FR")} € TTC <span style="font-size:13px;color:#0f766e;">(sous réserve de validation définitive du dossier et des conditions générales)</span></p>`
        : ""
    const paras = messagePlain
      .trim()
      .split(/\n\n+/)
      .map((p) => `<p>${escapeHtmlForEmail(p).replace(/\n/g, "<br/>")}</p>`)
      .join("")
    const espaceClient = opts?.espaceClient
    const loginUrl = `${APP_URL}/connexion`
    const clientSpaceText =
      espaceClient?.mode === "created"
        ? `\n\nVotre espace client a été créé automatiquement.\nEmail de connexion : ${espaceClient.email}\nMot de passe temporaire : ${espaceClient.tempPassword ?? "—"}\nConnexion : ${loginUrl}\nMerci de changer votre mot de passe dès la première connexion.`
        : espaceClient?.mode === "existing"
          ? `\n\nVous pouvez suivre votre dossier depuis votre espace client : ${loginUrl}`
          : ""
    const clientSpaceHtml =
      espaceClient?.mode === "created"
        ? `<div style="margin:16px 0;padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
             <p style="margin:0 0 8px;color:#1e3a8a;font-weight:700;">Espace client ouvert</p>
             <p style="margin:0 0 6px;"><strong>Email :</strong> ${escapeHtmlForEmail(espaceClient.email)}</p>
             <p style="margin:0 0 10px;"><strong>Mot de passe temporaire :</strong> ${escapeHtmlForEmail(espaceClient.tempPassword ?? "—")}</p>
             <p style="margin:0;color:#334155;font-size:13px;">Merci de changer votre mot de passe dès la première connexion.</p>
           </div>
           <p><a href="${loginUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Se connecter à mon espace client</a></p>`
        : espaceClient?.mode === "existing"
          ? `<p><a href="${loginUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accéder à mon espace client</a></p>`
          : ""
    return {
      subject: "Votre proposition RC Fabriquant - Optimum Assurance",
      text: `Bonjour ${raisonSociale},\n\nSuite à l’étude de votre demande d’assurance Responsabilité Civile Fabriquant, nous vous adressons les éléments suivants.\n\n${primeTxt}${messagePlain.trim()}${clientSpaceText}\n\nPour toute question, répondez directement à cet e-mail ou utilisez notre formulaire : ${APP_URL}/contact\n\nCordialement,\nOptimum Assurance`,
      html: `<p>Bonjour ${raisonSociale},</p><p>Suite à l’étude de votre demande d’assurance <strong>Responsabilité Civile Fabriquant</strong>, nous vous adressons les éléments suivants.</p>${primeHtml}<div style="margin:16px 0;color:#0f172a;line-height:1.5;">${paras}</div>${clientSpaceHtml}<p style="font-size:14px;color:#64748b;">Pour toute question, répondez à cet e-mail ou utilisez notre <a href="${APP_URL}/contact" style="color:#2563eb;font-weight:bold">formulaire de contact</a>.</p><p>Cordialement,<br>Optimum Assurance</p>`,
    }
  },
  remisePersonnaliseeEtude: (raisonSociale: string, primeAnnuelle: number, resumeUrl: string) => ({
    subject: "Votre proposition personnalisée - Assurance décennale - Optimum Assurance",
    text: `Bonjour ${raisonSociale},\n\nSuite à l'étude de votre dossier, nous avons le plaisir de vous transmettre notre proposition personnalisée.\n\nPrime annuelle : ${primeAnnuelle.toLocaleString("fr-FR")} €\n\nCliquez sur le lien ci-dessous pour finaliser votre souscription :\n\n${resumeUrl}\n\nCe lien est valable 7 jours.\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Suite à l'étude de votre dossier, nous avons le plaisir de vous transmettre notre <strong>proposition personnalisée</strong>.</p><p><strong>Prime annuelle :</strong> ${primeAnnuelle.toLocaleString("fr-FR")} €</p><p><a href="${resumeUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Finaliser ma souscription</a></p><p>Ce lien est valable 7 jours.</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  attestationMiseAJour: (raisonSociale: string, numero: string, documentUrl: string) => ({
    subject: `Attestation mise à jour - ${numero} - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nVos coordonnées ont été mises à jour. Votre attestation décennale ${numero} a été modifiée en conséquence.\n\nConsultez votre attestation à jour : ${documentUrl}\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Vos coordonnées ont été mises à jour. Votre attestation décennale <strong>${numero}</strong> a été modifiée en conséquence.</p><p><a href="${documentUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Voir mon attestation</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  confirmationResiliation: (raisonSociale: string, numero: string, typeDoc: string) => ({
    subject: `Résiliation confirmée - ${numero} - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nVotre ${typeDoc} ${numero} a été résilié(e) conformément à votre demande.\n\nPour toute nouvelle souscription : ${APP_URL}/devis\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre ${typeDoc} <strong>${numero}</strong> a été résilié(e) conformément à votre demande.</p><p>Pour toute nouvelle souscription : <a href="${APP_URL}/devis" style="color:#2563eb;font-weight:bold">Obtenir un devis</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
}
