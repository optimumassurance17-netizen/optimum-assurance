export const garantiesDecennale = [
  {
    nom: "RC Décennale obligatoire",
    description: "Dommages affectant la solidité de l'ouvrage pendant 10 ans après réception.",
    franchise: "1 000 €",
    plafond: "2 000 000 €",
  },
  {
    nom: "RC Professionnelle",
    description: "Dommages corporels, matériels et immatériels causés aux tiers pendant les travaux.",
    franchise: "1 000 €",
    plafond: "2 000 000 €",
  },
  {
    nom: "Bon fonctionnement (biennale)",
    description: "Équipements dissociables — réparation ou remplacement sous 2 ans.",
    franchise: "1 000 €",
    plafond: "600 000 €",
  },
  {
    nom: "Protection juridique",
    description: "Défense/recours et assistance juridique selon les conditions contractuelles applicables.",
    franchise: "—",
    plafond: "Selon conditions contractuelles",
  },
] as const

export const metiersBtp = [
  { label: "Plombier", icon: "🔧", href: "/assurance-decennale/plombier" },
  { label: "Électricien", icon: "⚡", href: "/assurance-decennale/electricien" },
  { label: "Peintre", icon: "🎨", href: "/assurance-decennale/peintre" },
  { label: "Carreleur", icon: "🧱", href: "/assurance-decennale/carreleur" },
  { label: "Maçon", icon: "🏗️", href: "/assurance-decennale/macon" },
  { label: "Couvreur", icon: "🏠", href: "/assurance-decennale/couvreur" },
  { label: "Menuisier", icon: "🪚", href: "/assurance-decennale/menuisier" },
  { label: "Charpentier", icon: "🪵", href: "/assurance-decennale/charpentier" },
  { label: "Étanchéité", icon: "💧", href: "/assurance-decennale/etancheite" },
  { label: "Terrassement", icon: "🚜", href: "/assurance-decennale/terrassement" },
  { label: "Architecte", icon: "📐", href: "/assurance-decennale/architecte" },
  { label: "Maître d'œuvre", icon: "📝", href: "/assurance-decennale/maitre-d-oeuvre" },
] as const

export const faqDevis = [
  {
    q: "Quels métiers sont couverts ?",
    r: "Plomberie, électricité, peinture, maçonnerie, couverture, charpente, carrelage, menuiserie, terrassement, BET… Plus de 100 activités du BTP. Utilisez notre formulaire pour vérifier si votre activité est éligible.",
  },
  {
    q: "Puis-je assurer plusieurs activités ?",
    r: "Oui. Vous pouvez sélectionner jusqu'à 8 activités dans un même devis. La prime est calculée selon votre chiffre d'affaires global et les activités déclarées.",
  },
  {
    q: "Quels documents pour souscrire ?",
    r: "Facture vierge, extrait KBis, pièce d'identité du représentant légal. Pour les sociétés résiliées : relevé de sinistralité. Pour la reprise du passé : attestation de non sinistralité.",
  },
  {
    q: "Combien de temps pour l'attestation ?",
    r: "Immédiatement après validation du paiement. Pas d'attente 24h — votre attestation est disponible dans l'espace client avec un QR code de vérification.",
  },
] as const
