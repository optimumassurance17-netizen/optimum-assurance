/**
 * Structure d'envoi d'emails
 * Utilise Resend (RESEND_API_KEY) ou autre fournisseur
 */

const FROM = process.env.EMAIL_FROM || "Optimum Assurance <noreply@optimum-assurance.fr>"

export async function sendEmail(params: {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: Array<{ filename: string; content: Buffer | string }>
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("RESEND_API_KEY non configuré - email non envoyé")
    return false
  }

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
      text: params.text,
      ...(params.html && { html: params.html }),
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const EMAIL_TEMPLATES = {
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
    text: `Bonjour ${raisonSociale},\n\nVotre paiement de ${montant.toLocaleString("fr-FR")} € pour le devis dommage ouvrage ${numero} a été enregistré avec succès.\n\nVotre attestation dommage ouvrage et votre facture acquittée sont disponibles dans votre espace client. L'attestation comporte un QR code de vérification. Validité unique de 10 ans, non résiliable.\n\nAccédez à votre espace client : ${APP_URL}/espace-client\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre paiement de <strong>${montant.toLocaleString("fr-FR")} €</strong> pour le devis dommage ouvrage ${numero} a été enregistré avec succès.</p><p>Votre attestation dommage ouvrage et votre facture acquittée sont disponibles dans votre espace client. L'attestation comporte un QR code de vérification. Validité unique de 10 ans, non résiliable.</p><p><a href="${APP_URL}/espace-client" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accéder à mon espace client</a></p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  devisDoAjoute: (raisonSociale: string, numero: string, primeAnnuelle: number) => ({
    subject: `Votre devis dommage ouvrage ${numero} est disponible - Optimum Assurance`,
    text: `Bonjour ${raisonSociale},\n\nVotre devis dommage ouvrage a été ajouté à votre espace client.\n\nRéférence : ${numero}\nPrime annuelle : ${primeAnnuelle.toLocaleString("fr-FR")} €\n\nConnectez-vous pour signer électroniquement puis régler par virement bancaire (Mollie) : ${APP_URL}/espace-client\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour ${raisonSociale},</p><p>Votre devis dommage ouvrage a été ajouté à votre espace client.</p><p><strong>Référence :</strong> ${numero}<br><strong>Prime annuelle :</strong> ${primeAnnuelle.toLocaleString("fr-FR")} €</p><p><a href="${APP_URL}/espace-client" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accéder à mon espace client</a></p><p>Signez électroniquement puis réglez par <strong>virement bancaire</strong> via Mollie (coordonnées sur la page de paiement).</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
  devisSauvegarde: (email: string, resumeUrl: string) => ({
    subject: "Reprendre votre devis - Optimum Assurance",
    text: `Bonjour,\n\nVous avez sauvegardé votre devis en cours. Cliquez sur le lien ci-dessous pour le reprendre :\n\n${resumeUrl}\n\nCe lien est valable 7 jours.\n\nCordialement,\nOptimum Assurance`,
    html: `<p>Bonjour,</p><p>Vous avez sauvegardé votre devis en cours. Cliquez sur le lien ci-dessous pour le reprendre :</p><p><a href="${resumeUrl}" style="color:#2563eb;font-weight:bold;background:#eff6ff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reprendre mon devis</a></p><p>Ce lien est valable 7 jours.</p><p>Cordialement,<br>Optimum Assurance</p>`,
  }),
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
