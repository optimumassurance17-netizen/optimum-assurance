/** Contexte pour l'assistant IA — assurance décennale Optimum */

import { faqs } from "./faq-data"
import { SITE_KNOWLEDGE } from "./site-knowledge"

// Base FAQ pour le matching (mots-clés → réponse)
const FAQ_BASE: { q: string; r: string }[] = [
  { q: "assurance décennale obligatoire loi Spinetta", r: "Oui. Depuis la loi Spinetta (1978), tout professionnel du BTP ayant un contrat direct avec le maître d'ouvrage doit souscrire une assurance décennale. Sans elle, vous risquez jusqu'à 75 000 € d'amende et 6 mois d'emprisonnement." },
  { q: "combien coûte prix tarif prime cotisation", r: "Le prix dépend de votre chiffre d'affaires, de vos activités et de votre historique. Chez Optimum, la cotisation minimale est de 600 €/an (soit environ 50 €/mois en équivalent). Les cotisations sont prélevées par trimestre (1er trimestre par carte + frais, puis SEPA). Utilisez notre simulateur sur la page d'accueil pour une estimation gratuite." },
  { q: "chiffre affaires CA déclarer contrôle greffe impôts régularisation", r: "Les déclarations de CA sont contrôlées chaque année auprès du greffe et des impôts. Donc autant bien indiquer le bon chiffre dès le départ — ça évite les régularisations et les mauvaises surprises !" },
  { q: "attestation rapidement délai immédiat", r: "En souscrivant en ligne : devis en 3 minutes, signature électronique, 1er trimestre par carte puis mandat SEPA. Votre attestation est disponible peu après validation du paiement dans votre espace client, avec un QR code de vérification — pas d'attente 24 h." },
  { q: "résilié non-paiement impayé", r: "Oui. Nous acceptons les sociétés résiliées pour non-paiement pour toutes les activités. Une majoration de 10 % s'applique sur la prime. Nous acceptons également les sociétés de nettoyage toiture." },
  { q: "garanties couvertes dommages ouvrage", r: "L'assurance décennale couvre les dommages graves affectant l'ouvrage pendant 10 ans après réception des travaux. Elle garantit la solidité de l'ouvrage et son aptitude à l'usage. RC Décennale, RC Pro, bon fonctionnement (biennale), assistance juridique." },
  { q: "payer plusieurs fois prélèvement SEPA mensuel trimestriel", r: "Oui. Paiement en 4 fois par an : 1er trimestre par carte (+ frais de gestion), puis 3 prélèvements SEPA trimestriels sur l'IBAN." },
  { q: "résilier contrat lettre recommandée échéance", r: "Les demandes de résiliation doivent être envoyées par lettre recommandée au plus tard 2 mois avant la date d'échéance (31 décembre). Un minimum d'un an de contrat est requis avant toute résiliation à l'échéance." },
  { q: "avenant frais modification", r: "Les avenants de modification sont soumis à des frais de 60 € uniques. Ces frais sont automatiquement reportés sur la prochaine échéance de prélèvement SEPA." },
  { q: "sinistre déclarer avis maître ouvrage", r: "Contactez-nous par email (contact@optimum-assurance.fr) ou via le chat. Nos experts vous accompagnent pour constituer votre dossier. Prévenez votre assureur dans les 5 jours après réception de l'avis du maître d'ouvrage." },
  { q: "reprise du passé rétroactif", r: "La reprise du passé permet de couvrir rétroactivement vos ouvrages des 3 derniers mois, sous réserve de non sinistralité. Elle n'est disponible que si vous n'avez déclaré aucun sinistre sur les 5 dernières années. Une majoration de 40 % s'applique sur ces 3 mois." },
  { q: "dommage ouvrage devis DO", r: "Après envoi de votre demande sur devis-dommage-ouvrage, notre équipe vous transmet le prix définitif sous 24h. Le devis est ensuite ajouté à votre espace client. Vous signez électroniquement le contrat, puis vous payez par virement bancaire via Mollie. L'attestation arrive après réception du virement." },
  { q: "étapes souscription parcours", r: "1) Devis — tarif en 3 minutes (équivalent mensuel, paiement trimestriel) ; 2) Souscription — coordonnées ; 3) Compte — email et mot de passe ; 4) Signature électronique du contrat ; 5) Mandat SEPA — IBAN ; 6) Paiement — 1er trimestre + frais par carte, puis prélèvements SEPA trimestriels ; 7) Confirmation — attestation dans l'espace client peu après validation du paiement." },
  { q: "compte souscrire créer", r: "Oui. Après le formulaire de souscription, vous créez un compte avec email et mot de passe. Ce compte permet d'accéder à votre attestation, gérer vos documents et déclarer un sinistre." },
  { q: "signature électronique contrat", r: "Après création de votre compte, vous suivez la page Signature : vous ouvrez le PDF et apposez votre signature électronique. Vous poursuivez ensuite vers le mandat SEPA et le paiement (Mollie)." },
  { q: "moyens paiement Mollie SEPA", r: "1er trimestre par carte bancaire (Mollie), puis prélèvements SEPA trimestriels sur l'IBAN du mandat." },
  { q: "après paiement attestation", r: "Dès validation du paiement, votre attestation décennale est disponible dans votre espace client. Vous pouvez la télécharger en PDF et la partager avec vos clients. Un QR code permet de vérifier son authenticité." },
  { q: "téléphone appeler contact", r: "Nous ne proposons pas de contact téléphonique. Toutes nos réponses se font en ligne : par email (contact@optimum-assurance.fr), via ce chat, ou via le formulaire de contact sur notre site." },
  { q: "devis obtenir tarif", r: "Rendez-vous sur /devis pour l'assurance décennale ou /devis-dommage-ouvrage pour le dommage ouvrage. Devis en 3 minutes, sans engagement." },
  { q: "nettoyage toiture couvreur", r: "Oui. Nous avons une offre dédiée pour le nettoyage toiture et peinture résine (I3 à I5). Sociétés résiliées acceptées. Taux 1.7% (CA ≤ 250k€) / 2% (CA > 250k€)." },
  { q: "plombier électricien peintre maçon carreleur", r: "Tous les corps de métier du BTP sont couverts : plombiers, électriciens, peintres, maçons, couvreurs, charpentiers, carreleurs, menuisiers, BET, architectes. Devis en 3 minutes sur /devis." },
  { q: "franchise plafond", r: "Franchise décennale : 1 000 €. Plafond de garantie : 2× le chiffre d'affaires. Pour le dommage ouvrage : aucune franchise (garantie obligatoire)." },
  { q: "minimum CA 40000", r: "Le chiffre d'affaires minimum déclaratif est de 40 000 €. En dessous, contactez-nous pour une étude personnalisée." },
  { q: "espace client connexion documents attestation où", r: "Après connexion sur /connexion, ouvrez /espace-client : vous y voyez vos documents (devis, contrats, attestations). Chaque document a une page détail avec téléchargement PDF. Les attestations peuvent être vérifiées publiquement via le QR code ou un lien /v/[token]." },
  { q: "guides pratiques obligation", r: "Les guides détaillés sont sur /guides et /guides/[slug] (ex. obligation décennale, dommage ouvrage, sinistre). La FAQ complète est sur /faq." },
  { q: "conditions générales dommage ouvrage CG DO", r: "Les conditions générales du produit dommage ouvrage sont sur /conditions-generales-dommage-ouvrage (annexées au devis). Les CGV de distribution sont sur /cgv." },
  { q: "contact formulaire email sans téléphone", r: "Pas de contact téléphone. Utilisez le formulaire /contact, l'email contact@optimum-assurance.fr, ou ce chat. Réponse sous 24h en général pour l'email." },
  { q: "reprendre devis brouillon lien sauvegardé", r: "Si vous avez sauvegardé un devis décennale par email, utilisez le lien reçu : /devis/resume/[token] — valable 7 jours." },
  { q: "étude dossier sinistres devis complexe", r: "Si le formulaire de /devis indique qu'une étude est nécessaire (ex. plusieurs sinistres), vous pouvez être orienté vers /etude pour laisser votre email et être recontacté sous 24 h avec une proposition." },
  { q: "activité pas dans la liste métier domaine introuvable spécial", r: "Si votre activité BTP n'apparaît pas dans la liste du devis, ouvrez la page /etude/domaine : décrivez votre domaine, votre email et éventuellement SIRET et CA. Notre équipe étudie le dossier et recontacte sous 24 h." },
]

// Toutes les FAQ (base + faq-data) pour le matching
export const faqForMatching: { q: string; r: string }[] = [
  ...FAQ_BASE,
  ...faqs.map((f) => ({ q: f.q.toLowerCase(), r: f.r })),
]

// Prompt système complet avec TOUTES les infos pour l'IA
const FAQ_TEXTE = faqs.map((f) => `Q: ${f.q}\nR: ${f.r}`).join("\n\n")

export const CHATBOT_SYSTEM_PROMPT = `Tu es l'assistant virtuel d'Optimum Assurance, courtier en assurance décennale BTP et dommage ouvrage.

RÈGLES IMPORTANTES :
- Réponds UNIQUEMENT en français, de manière courtoise et professionnelle.
- Base-toi UNIQUEMENT sur les informations ci-dessous. Ne invente rien.
- Pour les questions hors assurance (météo, blagues, etc.), redirige poliment vers l'assurance.
- Nous ne proposons PAS de contact téléphonique — uniquement en ligne (email, chat, formulaire).
- Pour un devis décennale : dirige vers /devis
- Pour un devis dommage ouvrage : dirige vers /devis-dommage-ouvrage
- Pour une question sur **où cliquer**, **l’ordre des étapes** ou **une page du site** : utilise la section « Fonctionnement du site » ci-dessous.
- Pour une question sur **un dossier personnel** (statut, impayé, document manquant) : tu n’y as pas accès — oriente vers contact@optimum-assurance.fr ou l’espace client après connexion.
- Pour une question complexe ou personnalisée : invite à écrire à contact@optimum-assurance.fr

FONCTIONNEMENT DU SITE OPTIMUM ASSURANCE (navigation, parcours, URLs, limites) :
${SITE_KNOWLEDGE}

INFORMATIONS OPTIMUM ASSURANCE (rappel synthétique) :
- Assurance décennale BTP : obligatoire (loi Spinetta 1978), minimum 600 €/an (affichage en équivalent mensuel ~50 €/mois ; paiement effectif trimestriel)
- CA minimum déclaratif : 40 000 €
- Attestation disponible peu après validation du paiement dans l'espace client (pas d'attente 24 h)
- Devis en 3 minutes, signature électronique du contrat, 1er trimestre + frais par carte (Mollie), puis prélèvements SEPA trimestriels sur l’IBAN du mandat
- Sociétés résiliées pour non-paiement acceptées (+10 % majoration)
- Nettoyage toiture et peinture résine (I3 à I5) : offre dédiée, taux 1.7% (CA ≤ 250k€) / 2% (CA > 250k€)
- Dommage ouvrage : devis sous 24h, auto-construction, garantie clos et couvert
- Franchise : 1 000 € (décennale) ; aucune (dommage ouvrage)
- Prélèvement trimestriel : 1er trimestre par carte (+ 60 € frais), puis SEPA trimestriel
- Avenants : 60 €
- Résiliation : lettre recommandée 2 mois avant échéance (31 décembre), minimum 1 an de contrat
- Pas de téléphone — support 100 % en ligne

FAQ COMPLÈTE (utilise ces réponses exactes) :
${FAQ_TEXTE}

Si la question ne correspond à aucune info ci-dessus, dis : "Je n'ai pas trouvé de réponse précise. Pour une réponse personnalisée, contactez-nous à contact@optimum-assurance.fr ou consultez notre FAQ : /faq"`

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
    if (score > bestScore && score >= 0.2) {
      bestScore = score
      bestAnswer = faq.r
    }
  }
  return bestAnswer
}
