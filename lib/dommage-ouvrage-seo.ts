export const DO_SEO = [
  {
    slug: "auto-construction",
    nom: "Auto-construction",
    description:
      "Assurance dommage ouvrage pour particuliers en auto-construction. Obligatoire pour faire construire sa maison. Garantie clos et couvert possible. Devis sous 24h.",
    avantages: [
      "Particuliers faisant construire pour leur compte",
      "Habitation, locatif ou revente",
      "Garantie clos et couvert uniquement possible",
      "Devis en ligne, prix sous 24h",
    ],
    faq: [
      { q: "L'auto-construction est-elle couverte ?", r: "Oui. Nous acceptons les particuliers qui font construire pour leur compte : habitation principale, locatif ou revente. Devis en ligne, étude sous 24h." },
      { q: "Qu'est-ce que la garantie clos et couvert ?", r: "Garantie limitée aux lots terrassement, VRD, gros œuvre, charpente, couverture, menuiserie extérieure. Idéal pour réduire la prime en auto-construction." },
    ],
  },
  {
    slug: "particulier",
    nom: "Particulier faisant construire",
    activite: "Construction maison individuelle",
    description:
      "Assurance dommage ouvrage obligatoire pour particuliers qui font construire. Maison individuelle, permis de construire. Devis gratuit en ligne.",
    avantages: [
      "Maison individuelle et jumelée",
      "Obligatoire avant le début des travaux",
      "Protection 10 ans après réception",
      "Devis personnalisé sous 24h",
    ],
    faq: [
      { q: "Le particulier doit-il souscrire une DO ?", r: "Oui. Tout maître d'ouvrage (y compris particulier) doit souscrire une assurance dommage ouvrage avant le début des travaux. Obligation légale depuis 1978." },
      { q: "Quand souscrire ?", r: "Avant le début des travaux. Le permis de construire et le DROC (date de réception des ouvrages) sont requis pour établir le devis." },
    ],
  },
  {
    slug: "constructeur-promoteur",
    nom: "Constructeur et promoteur",
    description:
      "Assurance dommage ouvrage pour constructeurs et promoteurs immobiliers. Immeubles, logements collectifs, VEFA. Devis sur mesure.",
    avantages: [
      "Promoteurs et vendeurs après achèvement",
      "Immeubles logements et commerces",
      "VEFA et vente d'immeubles à construire",
      "Étude personnalisée sous 24h",
    ],
    faq: [
      { q: "Le promoteur doit-il avoir une DO ?", r: "Oui. Le promoteur est maître d'ouvrage. Il doit souscrire une assurance dommage ouvrage pour couvrir les dommages affectant la solidité de l'ouvrage." },
      { q: "Quels types d'ouvrages ?", r: "Immeubles logements, logements et commerces, bureaux, établissements. Devis selon le coût de construction, la surface et les caractéristiques techniques." },
    ],
  },
  {
    slug: "clos-et-couvert",
    nom: "Garantie clos et couvert",
    description:
      "Assurance dommage ouvrage clos et couvert uniquement : garantie limitée aux lots structure. Réduction de prime pour auto-construction et petits chantiers.",
    avantages: [
      "Garantie limitée aux lots structure",
      "Terrassement, VRD, gros œuvre, charpente, couverture",
      "Menuiserie extérieure incluse",
      "Prime réduite vs garantie complète",
    ],
    faq: [
      { q: "Qu'est-ce que clos et couvert ?", r: "Garantie limitée aux lots affectant la structure : terrassement, VRD, fondations, gros œuvre, charpente, couverture, menuiserie extérieure. Pas les lots second œuvre (plomberie, électricité, etc.)." },
      { q: "Pour qui est-ce adapté ?", r: "Particuliers en auto-construction, petits chantiers, ou maîtres d'ouvrage souhaitant réduire la prime. Les lots second œuvre peuvent être assurés séparément par les artisans." },
    ],
  },
] as const
