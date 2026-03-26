export const METIERS_SEO = [
  {
    slug: "plombier",
    nom: "Plombier",
    activite: "Plomberie",
    prixMin: "50",
    description: "Assurance décennale obligatoire pour plombiers et plombiers-chauffagistes. Devis en 3 minutes, attestation immédiate. Tarifs dès 50 €/mois (équivalent), paiement trimestriel.",
    avantages: [
      "Tarifs adaptés au CA des plombiers",
      "Sociétés résiliées acceptées",
      "Attestation avec QR code de vérification",
      "Prélèvement trimestriel (1er trimestre par carte + frais, puis SEPA)",
    ],
    faq: [
      { q: "Quel prix pour un plombier ?", r: "La prime dépend de votre chiffre d'affaires. Pour un CA de 80 000 €, comptez environ 840 €/an. Utilisez notre simulateur pour une estimation immédiate." },
      { q: "Plombier-chauffagiste couvert ?", r: "Oui. Plomberie et chauffage sont des activités second œuvre couvertes. Sélectionnez les deux dans le formulaire de devis." },
    ],
  },
  {
    slug: "electricien",
    nom: "Électricien",
    activite: "Électricité",
    prixMin: "50",
    description: "Assurance décennale pour électriciens : obligatoire pour exercer. Devis gratuit en 3 minutes, attestation immédiate. Dès 50 €/mois (équivalent), paiement trimestriel.",
    avantages: [
      "Électricité bâtiment et spéciale",
      "Jusqu'à 30 % d'économies vs assureurs traditionnels",
      "Souscription 100 % en ligne",
      "Attestation disponible dès paiement",
    ],
    faq: [
      { q: "L'électricien doit-il avoir une décennale ?", r: "Oui. Tout électricien intervenant sur un ouvrage avec contrat direct au maître d'ouvrage doit souscrire une assurance décennale (loi Spinetta)." },
      { q: "Prix décennale électricien ?", r: "À partir de 600 €/an (soit environ 50 €/mois en équivalent) selon votre CA, prélèvement trimestriel. Un électricien à 100 000 € de CA paie environ 1 050 €/an chez Optimum." },
    ],
  },
  {
    slug: "peintre",
    nom: "Peintre",
    activite: "Peinture",
    prixMin: "50",
    description: "Assurance décennale peintre en bâtiment : obligatoire pour vos chantiers. Devis en ligne, attestation immédiate. Dès 50 €/mois (équivalent), paiement trimestriel.",
    avantages: [
      "Peinture bâtiment et ravalement",
      "Devis sans engagement",
      "Paiement trimestriel par carte puis SEPA",
      "Jeunes entreprises acceptées",
    ],
    faq: [
      { q: "Peintre sans décennale ?", r: "Sans assurance décennale, vous ne pouvez pas remettre d'attestation à vos clients. Risque : jusqu'à 75 000 € d'amende et 6 mois de prison." },
      { q: "Combien pour un peintre ?", r: "Prime dès 600 €/an. Pour 60 000 € de CA, environ 720 €/an. Devis personnalisé en 3 minutes sur notre site." },
    ],
  },
  {
    slug: "carreleur",
    nom: "Carreleur",
    activite: "Carrelage",
    prixMin: "50",
    description: "Assurance décennale carreleur : obligatoire pour les poseurs de carrelage. Devis gratuit, attestation immédiate. Dès 50 €/mois (équivalent), paiement trimestriel.",
    avantages: [
      "Carrelage et faïence couverts",
      "Tarification selon votre CA",
      "Souscription rapide en ligne",
      "Pas de rappel commercial",
    ],
    faq: [
      { q: "Le carrelage est-il couvert par la décennale ?", r: "Oui. Les travaux de carrelage font partie du second œuvre et sont couverts par l'assurance décennale obligatoire." },
      { q: "Prix décennale carreleur ?", r: "À partir de 600 €/an (≈ 50 €/mois équivalent), prélèvement trimestriel. Utilisez notre simulateur avec votre chiffre d'affaires pour une estimation précise." },
    ],
  },
  {
    slug: "macon",
    nom: "Maçon",
    activite: "Maçonnerie",
    prixMin: "90",
    description: "Assurance décennale maçon : gros œuvre obligatoire. Devis maçonnerie en 3 minutes. Tarifs adaptés aux entreprises de maçonnerie (affichage en équivalent mensuel, paiement trimestriel).",
    avantages: [
      "Maçonnerie et gros œuvre",
      "Fondations, béton, VRD",
      "Tarifs sur devis personnalisé",
      "Attestation immédiate",
    ],
    faq: [
      { q: "Maçon sans décennale ?", r: "Impossible. La maçonnerie est au cœur du gros œuvre. Tout maître d'ouvrage exige une attestation décennale avant de signer." },
      { q: "Prix pour un maçon ?", r: "Le gros œuvre est plus exposé : primes généralement supérieures au second œuvre. Devis personnalisé en 3 minutes." },
    ],
  },
  {
    slug: "couvreur",
    nom: "Couvreur",
    activite: "Couverture",
    prixMin: "90",
    description: "Assurance décennale couvreur : charpente et couverture. Obligatoire pour les travaux de toiture. Devis en ligne sous 24h si étude (équivalent mensuel, paiement trimestriel).",
    avantages: [
      "Couverture et étanchéité toiture",
      "Charpente couverte",
      "Nettoyage toiture (offre dédiée)",
      "Devis personnalisé",
    ],
    faq: [
      { q: "Couvreur obligé d'avoir une décennale ?", r: "Oui. La couverture fait partie du gros œuvre. Sans attestation, aucun maître d'ouvrage ne vous confiera de chantier." },
      { q: "Nettoyage toiture accepté ?", r: "Oui. Nous avons une offre dédiée pour le nettoyage toiture et peinture résine (I3 à I5). Sociétés résiliées acceptées." },
    ],
  },
  {
    slug: "menuisier",
    nom: "Menuisier",
    activite: "Menuiserie",
    prixMin: "50",
    description: "Assurance décennale menuisier : menuiserie intérieure et extérieure. Devis gratuit, attestation immédiate. Dès 50 €/mois (équivalent), paiement trimestriel.",
    avantages: [
      "Menuiserie bois et PVC",
      "Pose de portes et fenêtres",
      "Tarifs compétitifs",
      "100 % en ligne",
    ],
    faq: [
      { q: "Menuisier et décennale ?", r: "Oui. La menuiserie extérieure (portes, fenêtres) est particulièrement concernée. La décennale couvre les dommages à la solidité de l'ouvrage." },
      { q: "Combien pour un menuisier ?", r: "À partir de 600 €/an (≈ 50 €/mois équivalent), prélèvement trimestriel, selon votre CA et vos activités. Devis en 3 minutes sur notre site." },
    ],
  },
  {
    slug: "charpentier",
    nom: "Charpentier",
    activite: "Charpente",
    prixMin: "90",
    description: "Assurance décennale charpentier : charpente bois et métallique. Obligatoire pour les travaux de structure. Devis personnalisé (équivalent mensuel, paiement trimestriel).",
    avantages: [
      "Charpente bois et métallique",
      "Gros œuvre structure",
      "Tarifs sur devis",
      "Attestation rapide",
    ],
    faq: [
      { q: "Charpentier obligé décennale ?", r: "Oui. La charpente est un élément de structure. Tout charpentier doit pouvoir fournir une attestation décennale à ses clients." },
      { q: "Prix charpentier ?", r: "Le gros œuvre est plus exposé. Devis personnalisé en 3 minutes. Si CA supérieur à 200 000 € ou sinistres, étude sous 24h." },
    ],
  },
] as const

export type MetierSlug = (typeof METIERS_SEO)[number]["slug"]
