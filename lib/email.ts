/**
 * Structure d'envoi d'emails
 * Utilise Resend (RESEND_API_KEY) ou autre fournisseur
 */

import { SITE_URL as APP_URL } from "@/lib/site-url"
import {
  appendTransactionalEmailTextFooter,
  wrapTransactionalEmailHtml,
} from "@/lib/email-layout"

const FROM = process.env.EMAIL_FROM || "Optimum Assurance <noreply@optimum-assurance.fr>"

function escapeHtmlForEmail(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
  invitationSignatureDecennale: (raisonSociale: string, signatureLink: string, devisNumero: string) => ({
    subject: `Signature de votre contrat décennale — devis ${devisNumero} - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nVotre contrat d’assurance décennale est prêt à être signé électroniquement.\n\nLien de signature :\n${signatureLink}\n\nRéférence devis : ${devisNumero}\n\nAprès signature : connectez-vous sur ${APP_URL} avec votre compte, puis ouvrez la page Mandat SEPA (${APP_URL}/mandat-sepa) pour l’IBAN et le 1er trimestre par carte (Mollie). Les échéances suivantes : prélèvements SEPA trimestriels.\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre <strong>contrat d’assurance décennale</strong> est prêt à être signé électroniquement.</p><p><a href="${signatureLink}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Signer le contrat</a></p><p style="font-size:13px;color:#64748b;">Référence devis : <strong>${devisNumero}</strong></p><p style="font-size:13px;color:#64748b;"><strong>Après signature</strong> : connectez-vous, puis <strong>Mandat SEPA</strong> — IBAN puis <strong>1er trimestre par carte</strong> (Mollie) ; ensuite prélèvements SEPA.</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
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
  alerteImpaye: (raisonSociale: string) => ({
    subject: "Régularisation de votre paiement - Optimum Assurance",
    text: `Bonjour ${raisonSociale},\n\nVotre attestation a été suspendue pour défaut de paiement.\n\nRégularisez en ligne par carte bancaire : ${APP_URL}/espace-client/regularisation\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre attestation a été suspendue pour défaut de paiement.</p><p><a href="${APP_URL}/espace-client/regularisation" style="color:#2563eb;font-weight:bold">Régulariser mon paiement par CB</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  rappelDevisAbandonne: (raisonSociale: string, primeAnnuelle?: number) => ({
    subject: "Votre devis assurance décennale vous attend - Optimum Assurance",
    text: `Bonjour ${raisonSociale},\n\nVous avez demandé un devis assurance décennale. La prime annuelle était de ${primeAnnuelle ? primeAnnuelle.toLocaleString("fr-FR") + " €" : "disponible"}.\n\nFinalisez votre souscription en ligne : ${APP_URL}/devis\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Vous avez demandé un devis assurance décennale. La prime annuelle était de <strong>${primeAnnuelle ? primeAnnuelle.toLocaleString("fr-FR") + " €" : "disponible"}</strong>.</p><p><a href="${APP_URL}/devis" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Finaliser mon devis</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
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
  propositionRcFabriquant: (raisonSociale: string, messagePlain: string, primeAnnuelle?: number) => {
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
    return {
      subject: "Votre proposition RC Fabriquant - Optimum Assurance",
      text: `Bonjour ${raisonSociale},\n\nSuite à l’étude de votre demande d’assurance Responsabilité Civile Fabriquant, nous vous adressons les éléments suivants.\n\n${primeTxt}${messagePlain.trim()}\n\nPour toute question, répondez directement à cet e-mail ou utilisez notre formulaire : ${APP_URL}/contact\n\nCordialement,\nOptimum Assurance`,
      html: `<p>Bonjour ${raisonSociale},</p><p>Suite à l’étude de votre demande d’assurance <strong>Responsabilité Civile Fabriquant</strong>, nous vous adressons les éléments suivants.</p>${primeHtml}<div style="margin:16px 0;color:#0f172a;line-height:1.5;">${paras}</div><p style="font-size:14px;color:#64748b;">Pour toute question, répondez à cet e-mail ou utilisez notre <a href="${APP_URL}/contact" style="color:#2563eb;font-weight:bold">formulaire de contact</a>.</p><p>Cordialement,<br>Optimum Assurance</p>`,
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
