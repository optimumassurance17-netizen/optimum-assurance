/** Contexte pour l'assistant IA — assurance décennale Optimum */
export const CHATBOT_SYSTEM_PROMPT = `Tu es l'assistant virtuel d'Optimum Assurance, courtier en assurance décennale BTP et dommage ouvrage.

RÈGLES IMPORTANTES :
- Réponds UNIQUEMENT en français, de manière courtoise et professionnelle.
- Base-toi sur les informations fournies. Ne invente rien.
- Pour les questions hors assurance (météo, blagues, etc.), redirige poliment vers l'assurance.
- Nous ne proposons PAS de contact téléphonique — uniquement en ligne (email, chat, formulaire).
- Pour un devis : dirige vers /devis ou /devis-dommage-ouvrage
- Pour une question complexe ou personnalisée : invite à nous écrire par email (contact@optimum-assurance.fr) ou via le formulaire de contact.

INFORMATIONS OPTIMUM ASSURANCE :
- Assurance décennale BTP : obligatoire (loi Spinetta 1978), dès 70 €/mois
- Attestation IMMÉDIATE après paiement (pas 24h)
- Devis en 3 minutes, signature Yousign, paiement SEPA (Mollie)
- Sociétés résiliées pour non-paiement acceptées (+10%)
- Dommage ouvrage : devis sous 24h, auto-construction, clos et couvert
- Franchise : 500 € ou 1 000 €
- Prélèvement mensuel ou trimestriel
- Pas de numéro de téléphone — support 100 % en ligne`

export const faqForMatching = [
  { q: "assurance décennale obligatoire", r: "Oui. Depuis la loi Spinetta (1978), tout professionnel du BTP ayant un contrat direct avec le maître d'ouvrage doit souscrire une assurance décennale. Sans elle, vous risquez jusqu'à 75 000 € d'amende et 6 mois d'emprisonnement." },
  { q: "combien coûte prix tarif", r: "Le prix dépend de votre chiffre d'affaires, de vos activités et de votre historique. Chez Optimum, la cotisation minimale est de 600 €/an (dès 70 €/mois). Utilisez notre simulateur sur la page d'accueil pour une estimation gratuite." },
  { q: "attestation rapidement délai", r: "En souscrivant en ligne : devis en 3 minutes, signature électronique, paiement par prélèvement SEPA. Votre attestation est disponible IMMÉDIATEMENT dans votre espace client, avec un QR code de vérification. Pas d'attente 24h." },
  { q: "résilié non-paiement impayé", r: "Oui. Nous acceptons les sociétés résiliées pour non-paiement pour toutes les activités. Une majoration de 10 % s'applique sur la prime. Nous acceptons également les sociétés de nettoyage toiture." },
  { q: "garanties couvertes", r: "L'assurance décennale couvre les dommages graves affectant l'ouvrage pendant 10 ans après réception des travaux. Elle garantit la solidité de l'ouvrage et son aptitude à l'usage. RC Décennale, RC Pro, bon fonctionnement (biennale), assistance juridique." },
  { q: "payer plusieurs fois prélèvement SEPA", r: "Oui. Nous proposons le prélèvement mensuel ou trimestriel par SEPA. Des frais de gestion de 60 € s'appliquent sur le premier prélèvement." },
  { q: "résilier contrat", r: "Les demandes de résiliation doivent être envoyées par lettre recommandée au plus tard 2 mois avant la date d'échéance (31 décembre). Un minimum d'un an de contrat est requis avant toute résiliation à l'échéance." },
  { q: "avenant frais", r: "Les avenants de modification sont soumis à des frais de 60 € uniques. Ces frais sont automatiquement reportés sur la prochaine échéance de prélèvement SEPA." },
  { q: "sinistre déclarer", r: "Contactez-nous par email (contact@optimum-assurance.fr) ou via le chat. Nos experts vous accompagnent pour constituer votre dossier. Prévenez votre assureur dans les 5 jours après réception de l'avis du maître d'ouvrage." },
  { q: "reprise du passé", r: "La reprise du passé permet de couvrir rétroactivement vos ouvrages des 3 derniers mois, sous réserve de non sinistralité. Elle n'est disponible que si vous n'avez déclaré aucun sinistre sur les 5 dernières années. Une majoration de 40 % s'applique sur ces 3 mois." },
  { q: "dommage ouvrage devis", r: "Après envoi de votre demande sur devis-dommage-ouvrage, notre équipe vous transmet le prix définitif sous 24h. Le devis est ensuite ajouté à votre espace client. Vous signez électroniquement (Yousign), puis vous validez le paiement par Mollie Pay by Bank." },
  { q: "étapes souscription", r: "1) Devis — tarif en 3 minutes ; 2) Souscription — coordonnées ; 3) Compte — email et mot de passe ; 4) Signature — Yousign ; 5) Paiement — SEPA. Attestation immédiate après validation." },
  { q: "compte souscrire", r: "Oui. Après le formulaire de souscription, vous créez un compte avec email et mot de passe. Ce compte permet d'accéder à votre attestation, gérer vos documents et déclarer un sinistre." },
  { q: "signature électronique Yousign", r: "Après création de votre compte, vous recevez un lien pour signer le contrat via Yousign. Vous consultez le document et signez en quelques clics. La signature est juridiquement valide. Vous êtes ensuite redirigé vers le paiement." },
  { q: "moyens paiement", r: "Le paiement se fait par prélèvement SEPA (Mollie Pay by Bank). Vous saisissez vos coordonnées bancaires une seule fois. Les échéances suivantes sont prélevées automatiquement, mensuellement ou trimestriellement." },
  { q: "après paiement", r: "Dès validation du paiement, votre attestation décennale est disponible dans votre espace client. Vous pouvez la télécharger en PDF et la partager avec vos clients. Un QR code permet de vérifier son authenticité." },
  { q: "téléphone appeler", r: "Nous ne proposons pas de contact téléphonique. Toutes nos réponses se font en ligne : par email (contact@optimum-assurance.fr), via ce chat, ou via le formulaire de contact sur notre site." },
]

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function findBestFaqMatch(userMessage: string): string | null {
  const normalized = normalize(userMessage)
  const words = normalized.split(" ").filter((w) => w.length > 2)
  if (words.length === 0) return null

  let bestScore = 0
  let bestAnswer: string | null = null

  for (const faq of faqForMatching) {
    const faqWords = normalize(faq.q).split(" ")
    let matches = 0
    for (const w of words) {
      if (faqWords.some((fw) => fw.includes(w) || w.includes(fw))) matches++
    }
    const score = matches / Math.max(words.length, faqWords.length)
    if (score > bestScore && score >= 0.3) {
      bestScore = score
      bestAnswer = faq.r
    }
  }
  return bestAnswer
}
