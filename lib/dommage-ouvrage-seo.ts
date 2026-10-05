export type DoSeoEntry = {
  slug: string
  nom: string
  activite?: string
  description: string
  avantages: string[]
  dossierPreparation: {
    titre: string
    paragraphes: string[]
    documentsRequis: string[]
  }
  faq: { q: string; r: string }[]
}

export const DO_SEO: readonly DoSeoEntry[] = [
  {
    slug: "auto-construction",
    nom: "Auto-construction",
    description:
      "Assurance dommage ouvrage pour particuliers en auto-construction. Obligatoire pour faire construire sa maison. Garantie clos et couvert possible. Devis sous 24h.",
    avantages: [
      "Particuliers faisant construire pour leur compte",
      "Habitation principale, locatif ou projet destiné à la revente",
      "Formule clos et couvert acceptée pour alléger la prime",
      "Étude personnalisée et tarif transmis sous 24 h",
    ],
    dossierPreparation: {
      titre: "Préparer un dossier DO en auto-construction",
      paragraphes: [
        "En auto-construction, le particulier assume la responsabilité de maître d'ouvrage. Même si vous réalisez une partie des travaux vous-même, les banques et les notaires exigent une assurance dommage ouvrage pour débloquer les fonds ou sécuriser une future revente dans les 10 ans.",
        "Les lots structurels (fondations, gros œuvre, charpente, toiture, menuiseries extérieures) réalisés par des artisans doivent impérativement être accompagnés de leurs attestations d'assurance décennale valides à la date d'ouverture du chantier.",
      ],
      documentsRequis: [
        "Permis de construire accordé et déclaration d'ouverture de chantier (DROC)",
        "Étude de sol (G2 AVP ou PRO) et plans côtés du projet",
        "Attestations décennales des artisans intervenant sur les lots structurels",
        "Estimation détaillée du coût total de construction (matériaux et main-d'œuvre)",
      ],
    },
    faq: [
      {
        q: "L'auto-construction est-elle couverte par Optimum Assurance ?",
        r: "Oui. Nous étudions et couvrons les particuliers faisant construire pour leur propre compte, qu'il s'agisse d'une résidence principale, secondaire, d'un investissement locatif ou d'un bien destiné à la revente.",
      },
      {
        q: "Qu'est-ce que la formule clos et couvert en auto-construction ?",
        r: "Cette formule limite l'assurance aux lots de l'enveloppe et de la structure : terrassement, fondations, gros œuvre, charpente, couverture et menuiseries extérieures. Elle permet de réduire significativement le montant de la prime tout en protégeant les éléments les plus critiques de la maison.",
      },
      {
        q: "Que se passe-t-il en cas de revente de la maison avant 10 ans sans DO ?",
        r: "En cas de vente dans les dix ans suivant l'achèvement, le notaire mentionne obligatoirement dans l'acte authentique l'absence d'assurance dommage ouvrage. L'acquéreur peut exiger une baisse substantielle du prix de vente ou se retourner directement contre vous sur votre patrimoine personnel en cas de désordre grave.",
      },
      {
        q: "Combien coûte une assurance dommage ouvrage en auto-construction ?",
        r: "Le tarif se situe généralement entre 1,8 % et 3,5 % du coût global de construction selon la zone géographique, les études géotechniques réalisées et la part de travaux confiée à des professionnels assurés en décennale. Notre étude est sans engagement sous 24 h.",
      },
    ],
  },
  {
    slug: "particulier",
    nom: "Particulier faisant construire",
    activite: "Construction maison individuelle",
    description:
      "Assurance dommage ouvrage obligatoire pour particuliers qui font construire. Maison individuelle, permis de construire. Devis gratuit en ligne.",
    avantages: [
      "Maisons individuelles, extensions et rénovations lourdes",
      "Souscription impérative avant l'ouverture du chantier",
      "Protection intégrale de 10 ans à compter de la réception",
      "Indemnisation rapide sans recherche préalable de responsabilité",
    ],
    dossierPreparation: {
      titre: "Constituer votre dossier de particulier maître d'ouvrage",
      paragraphes: [
        "Lorsque vous faites construire une maison individuelle par un maître d'œuvre, des artisans ou un architecte, l'assurance dommage ouvrage est obligatoire en vertu de la loi Spinetta (article L.242-1 du Code des assurances).",
        "Cette assurance est une protection financière directe pour votre famille : en cas de fissure structurelle, d'effondrement partiel ou d'infiltration grave, l'assureur DO préfinance les travaux de réparation sous 90 à 105 jours, sans attendre les conclusions d'un procès entre les différents corps de métier.",
      ],
      documentsRequis: [
        "Copie de l'arrêté de permis de construire et récépissé de dépôt de la DROC",
        "Contrat de maîtrise d'œuvre ou devis descriptifs des entreprises du bâtiment",
        "Attestations d'assurance décennale en cours de validité de chaque intervenant",
        "Rapport d'étude géotechnique des sols (G2)",
      ],
    },
    faq: [
      {
        q: "Le particulier qui fait construire doit-il obligatoirement souscrire une DO ?",
        r: "Oui. L'obligation concerne tout maître d'ouvrage faisant réaliser des travaux de bâtiment. Les établissements prêteurs réclament systématiquement l'attestation de souscription dommage ouvrage avant de débloquer les premières tranches de crédit immobilier.",
      },
      {
        q: "Quand faut-il souscrire l'assurance dommage ouvrage ?",
        r: "La souscription doit obligatoirement avoir lieu avant l'ouverture officielle du chantier (date de la DROC). Une fois les fondations ou le gros œuvre engagés, la souscription devient beaucoup plus complexe et plus coûteuse.",
      },
      {
        q: "Y a-t-il une franchise sur la garantie dommage ouvrage pour un particulier ?",
        r: "Non. Sur la garantie obligatoire décennale préfinancée par la DO pour les logements d'habitation, la loi interdit toute franchise opposable au particulier assuré. La réparation est prise en charge à 100 % des coûts de réfection.",
      },
      {
        q: "Quelle est la durée exacte de validité du contrat DO ?",
        r: "Le contrat prend effet à l'expiration de la garantie de parfait achèvement (un an après la réception des travaux) et expire exactement 10 ans après cette même date de réception. La couverture est unique et reste attachée au bien même en cas de revente.",
      },
    ],
  },
  {
    slug: "constructeur-promoteur",
    nom: "Constructeur et promoteur",
    description:
      "Assurance dommage ouvrage pour constructeurs et promoteurs immobiliers. Immeubles, logements collectifs, VEFA. Devis sur mesure.",
    avantages: [
      "Promoteurs immobiliers, marchands de biens et constructeurs",
      "Immeubles de logements collectifs, bureaux et opérations mixtes",
      "Conformité VEFA et transmission immédiate des attestations notariales",
      "Possibilité d'intégrer les garanties complémentaires (CNR, CCRD, RCM)",
    ],
    dossierPreparation: {
      titre: "Cadre technique et juridique pour professionnels de la construction",
      paragraphes: [
        "Pour un promoteur immobilier ou un marchand de biens vendant des immeubles à construire (VEFA) ou après achèvement, l'attestation dommage ouvrage est une condition de validité de l'acte notarié de vente.",
        "Le dossier technique doit faire l'objet d'un contrôle technique obligatoire (contrôleur technique agréé avec missions L, S, Th) et d'une étude de sol complète pour valider la tarification auprès de notre compagnie partenaire.",
      ],
      documentsRequis: [
        "Dossier de permis de construire complet et plans d'architecte",
        "Contrat de contrôle technique avec rapport initial de contrôle technique (RICT)",
        "Rapport d'étude de sol G2 AVP/PRO et étude géotechnique",
        "Planning prévisionnel de l'opération et tableau des marchés de travaux par lot",
      ],
    },
    faq: [
      {
        q: "Le promoteur est-il pénalement responsable du défaut de DO ?",
        r: "Oui. L'article L.243-3 du Code des assurances punit le défaut de souscription d'une peine de six mois d'emprisonnement et de 75 000 € d'amende pour les professionnels de la construction et de la promotion.",
      },
      {
        q: "Peut-on adjoindre des garanties complémentaires au contrat DO ?",
        r: "Tout à fait. Nous proposons l'intégration de la garantie Constructeur Non Réalisateur (CNR), de la police Tous Risques Chantier (TRC), de la Responsabilité Civile Maître d'Ouvrage (RCMO) et des garanties de bon fonctionnement et dommages immatériels.",
      },
      {
        q: "Quels types d'opérations immobilières sont éligibles ?",
        r: "Nous couvrons les immeubles de logements collectifs neufs, les réhabilitations lourdes avec surélévation, les locaux commerciaux, bureaux et bâtiments tertiaires. Chaque étude s'ajuste au coût global HT des travaux.",
      },
      {
        q: "Quel est le délai de délivrance de l'attestation pour les actes notariés ?",
        r: "Dès l'acceptation du devis, la validation des pièces techniques principales et le règlement de la prime unique, l'attestation officielle de couverture est émise et mise à disposition dans l'espace gestion pour transmission immédiate au notaire.",
      },
    ],
  },
  {
    slug: "clos-et-couvert",
    nom: "Garantie clos et couvert",
    description:
      "Assurance dommage ouvrage clos et couvert uniquement : garantie limitée aux lots structure. Réduction de prime pour auto-construction et petits chantiers.",
    avantages: [
      "Concentration de l'assurance sur l'ossature et l'enveloppe du bâtiment",
      "Économie de prime substantielle par rapport à une DO complète",
      "Lots structurels protégés : terrassement, gros œuvre, charpente, toiture, menuiseries extérieures",
      "Idéal en auto-construction assistée ou rénovation structurelle",
    ],
    dossierPreparation: {
      titre: "Périmètre de la formule dommage ouvrage clos et couvert",
      paragraphes: [
        "La garantie clos et couvert est une formule sur mesure conçue pour protéger ce qui coûte le plus cher à réparer en cas de sinistre : la stabilité de l'immeuble et son étanchéité à l'eau et à l'air.",
        "Tous les lots de second œuvre (cloisons, revêtements de sols, plomberie sanitaire, électricité, peintures) restent exclus du préfinancement DO, mais demeurent couverts par les polices d'assurance décennale individuelles des entreprises ayant réalisé ces travaux.",
      ],
      documentsRequis: [
        "Permis de construire et descriptif précis des lots formant le clos et couvert",
        "Marchés ou devis des lots gros œuvre, charpente, couverture et menuiseries extérieures",
        "Attestations décennales des entreprises titulaires des lots structurels",
        "Déclaration de la valeur de construction propre aux lots clos et couvert",
      ],
    },
    faq: [
      {
        q: "Quels lots sont exactement couverts par la formule clos et couvert ?",
        r: "Sont inclus : terrassement, voiries et réseaux divers indispensables, fondations, maçonnerie de structure, charpente bois ou métal, couverture, étanchéité de toiture-terrasse et menuiseries extérieures vitrées (portes et fenêtres).",
      },
      {
        q: "Pourquoi choisir une DO clos et couvert plutôt qu'une DO complète ?",
        r: "Cette formule permet d'économiser entre 20 % et 40 % sur le montant total de la prime tout en satisfaisant aux exigences de la banque sur la partie la plus vulnérable de l'ouvrage.",
      },
      {
        q: "Les banques acceptent-elles la garantie clos et couvert ?",
        r: "Oui, la grande majorité des organismes bancaires acceptent une attestation dommage ouvrage mentionnant le clos et couvert, en particulier pour les dossiers en auto-construction où l'emprunteur se réserve les travaux intérieurs de finition.",
      },
      {
        q: "Que se passe-t-il si une fuite de plomberie survient avec une DO clos et couvert ?",
        r: "La plomberie étant un lot exclu de la garantie clos et couvert, ce n'est pas l'assureur DO qui préfinance la réparation. Vous devez alors actionner directement l'assurance décennale du plombier via son attestation d'assurance.",
      },
    ],
  },
] as const
