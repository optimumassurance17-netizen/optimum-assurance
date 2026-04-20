import { TARIFICATION_110_ACTIVITES } from "@/lib/tarification-data"

function slugifyActivity(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function categoryIntro(categorie: string): string {
  switch (categorie) {
    case "Gros œuvre":
      return "Activité de gros œuvre avec exposition structurelle importante."
    case "Structure":
      return "Travaux de structure exigeant une attestation décennale claire avant chantier."
    case "Toiture":
      return "Interventions de toiture et d'enveloppe exposées aux risques d'infiltration et d'étanchéité."
    case "Technique":
      return "Travaux techniques du bâtiment : réseaux, fluides, électricité ou équipements."
    case "Finition":
      return "Activité de second œuvre nécessitant une couverture adaptée aux ouvrages réalisés."
    case "Extérieur":
      return "Travaux extérieurs, VRD ou aménagements liés au chantier principal."
    case "PIB":
      return "Profession intellectuelle du bâtiment avec exposition décennale spécifique."
    case "Spécialisé":
      return "Intervention spécialisée du bâtiment avec étude précise du risque."
    case "Divers":
      return "Activité multi-lots ou transverse du bâtiment nécessitant une analyse complète."
    default:
      return "Activité du bâtiment nécessitant une assurance décennale adaptée."
  }
}

function categoryBenefits(categorie: string): string[] {
  switch (categorie) {
    case "Gros œuvre":
      return [
        "Activité structurelle couverte avec tarification adaptée au gros œuvre",
        "Devis en ligne puis étude ajustée selon le chiffre d'affaires déclaré",
        "Attestation décennale utilisable sur devis et factures",
      ]
    case "Structure":
      return [
        "Couverture adaptée aux travaux de structure bois, métal ou modulaire",
        "Tarification cohérente avec le niveau d'exposition du métier",
        "Parcours digital simple pour obtenir un devis et préparer l'attestation",
      ]
    case "Toiture":
      return [
        "Métiers de toiture et d'étanchéité pris en compte dans le parcours décennale",
        "Devis selon activité déclarée, chiffre d'affaires et sinistralité",
        "Attestation rapide pour sécuriser les chantiers et les maîtres d'ouvrage",
      ]
    case "Technique":
      return [
        "Activités techniques du bâtiment couvertes avec devis selon le profil réel",
        "Parcours adapté aux travaux d'électricité, plomberie, chauffage ou CVC",
        "Paiement trimestriel et attestation conforme après validation du dossier",
      ]
    case "Finition":
      return [
        "Second œuvre couvert avec une tarification cohérente à l'activité exercée",
        "Devis sans engagement selon le chiffre d'affaires et les lots déclarés",
        "Souscription en ligne et attestation accessible rapidement",
      ]
    case "Extérieur":
      return [
        "Activités extérieures, VRD ou aménagements prises en compte dans le devis",
        "Tarification adaptée aux travaux de chantier et à leur exposition",
        "Attestation décennale claire pour les maîtres d'ouvrage et partenaires",
      ]
    case "PIB":
      return [
        "Professions intellectuelles du bâtiment avec exposition décennale spécifique",
        "Devis adapté aux missions de maîtrise d'œuvre, BET et ingénierie",
        "Positionnement clair entre responsabilité décennale et accompagnement projet",
      ]
    case "Spécialisé":
      return [
        "Activités spécialisées du bâtiment intégrées dans le parcours décennale",
        "Étude du risque plus précise selon la technicité de l'intervention",
        "Devis en ligne puis validation selon les informations du dossier",
      ]
    case "Divers":
      return [
        "Activités multi-lots ou transverses prises en compte dans l'analyse du risque",
        "Devis construit selon le chiffre d'affaires et le périmètre d'intervention",
        "Attestation décennale claire pour sécuriser la relation client",
      ]
    default:
      return [
        "Activité du bâtiment couverte selon le profil déclaré",
        "Devis en ligne avec tarification adaptée au chiffre d'affaires",
        "Attestation rapide après validation du dossier",
      ]
  }
}

function categoryFaq(categorie: string, activite: string, prixMinAnnuel: number): { q: string; r: string }[] {
  const prixMensuelEquivalent = Math.max(50, Math.round(prixMinAnnuel / 12))

  if (categorie === "PIB") {
    return [
      {
        q: `Une activité de type ${activite.toLowerCase()} doit-elle avoir une assurance décennale ?`,
        r: `Oui lorsque votre mission entre dans le champ de responsabilité décennale et que vous intervenez avec un lien contractuel sur l'ouvrage. La couverture exacte dépend de la nature de vos missions et du contrat souscrit.`,
      },
      {
        q: `Quel budget prévoir pour ${activite.toLowerCase()} ?`,
        r: `Le tarif dépend du chiffre d'affaires, de la nature des missions et de l'historique du dossier. Le niveau d'entrée observé pour cette activité démarre autour de ${prixMinAnnuel} €/an, soit environ ${prixMensuelEquivalent} €/mois en équivalent.`,
      },
    ]
  }

  return [
    {
      q: `${activite} : la décennale est-elle obligatoire ?`,
      r: `Oui dès lors que vos travaux relèvent de la responsabilité décennale avec un contrat direct sur l'ouvrage. L'attestation reste un document clé avant démarrage du chantier ou remise du devis.`,
    },
    {
      q: `Quel prix pour une assurance décennale ${activite.toLowerCase()} ?`,
      r: `Le prix varie selon le chiffre d'affaires, les activités déclarées et la sinistralité. Pour cette activité, le niveau d'entrée constaté démarre autour de ${prixMinAnnuel} €/an, soit environ ${prixMensuelEquivalent} €/mois en équivalent.`,
    },
  ]
}

function categoryGenericName(activite: string): string {
  return activite
}

function categoryRiskFocus(categorie: string): string {
  switch (categorie) {
    case "Gros œuvre":
      return "solidité de l'ouvrage, fondations, structure porteuse et stabilité générale"
    case "Structure":
      return "structure bois, métal ou modulaire, assemblages et tenue de l'ouvrage"
    case "Toiture":
      return "étanchéité, infiltrations, couverture et protection de l'enveloppe"
    case "Technique":
      return "réseaux, équipements techniques, fluides, raccordements et fonctionnement d'ensemble"
    case "Finition":
      return "pose, intégration dans l'ouvrage et conformité des éléments de second œuvre"
    case "Extérieur":
      return "terrassement, VRD, assainissement, ouvrages extérieurs et adaptation au terrain"
    case "PIB":
      return "conception, coordination, mission intellectuelle et responsabilité sur l'ouvrage"
    case "Spécialisé":
      return "technicité d'intervention, procédés particuliers et exposition chantier spécifique"
    case "Divers":
      return "pilotage multi-lots, périmètre exact d'intervention et coordination contractuelle"
    default:
      return "conformité du chantier, périmètre d'intervention et responsabilité sur l'ouvrage"
  }
}

function categoryPreparationHint(categorie: string): string {
  switch (categorie) {
    case "PIB":
      return "précisez bien la nature de vos missions, votre position contractuelle et votre volume d'affaires"
    case "Technique":
      return "décrivez les lots exacts réalisés, les équipements concernés et les activités complémentaires"
    case "Toiture":
      return "indiquez précisément les techniques utilisées, les supports et les travaux d'étanchéité associés"
    case "Gros œuvre":
    case "Structure":
      return "préparez votre SIRET, votre chiffre d'affaires et le détail des ouvrages structurels réellement exécutés"
    default:
      return "préparez votre SIRET, votre chiffre d'affaires et la liste exacte des activités exercées"
  }
}

export type DecennaleSeoEntry = {
  kind: "activity" | "headterm"
  slug: string
  nom: string
  activite: string
  prixMin: string
  description: string
  avantages: string[]
  faq: { q: string; r: string }[]
  categorie: string
  activiteSource: string
  prixMinAnnuel: number
  prixMinMensuelEquivalent: number
  tauxBase: number
  riskFocus: string
  preparationHint: string
  relatedActivitySlugs: string[]
  prefillActivities: string[]
}

export type DecennaleSeoSlug = DecennaleSeoEntry["slug"]

const ACTIVITY_ENTRIES: DecennaleSeoEntry[] = TARIFICATION_110_ACTIVITES.map((activity) => {
  const prixMinMensuelEquivalent = Math.max(50, Math.round(activity.prime_min / 12))

  return {
    kind: "activity",
    slug: slugifyActivity(activity.activite),
    nom: categoryGenericName(activity.activite),
    activite: activity.activite,
    prixMin: String(prixMinMensuelEquivalent),
    description: `${activity.activite} : assurance décennale en ligne avec devis selon chiffre d'affaires, attestation rapide et paiement trimestriel. ${categoryIntro(activity.categorie)} Dès ${prixMinMensuelEquivalent} €/mois équivalent.`,
    avantages: categoryBenefits(activity.categorie),
    faq: categoryFaq(activity.categorie, activity.activite, activity.prime_min),
    categorie: activity.categorie,
    activiteSource: activity.activite,
    prixMinAnnuel: activity.prime_min,
    prixMinMensuelEquivalent,
    tauxBase: activity.taux_base,
    riskFocus: categoryRiskFocus(activity.categorie),
    preparationHint: categoryPreparationHint(activity.categorie),
    relatedActivitySlugs: [slugifyActivity(activity.activite)],
    prefillActivities: [activity.activite],
  }
})

type HeadtermSeed = {
  slug: string
  nom: string
  activite: string
  categorie: string
  descriptionLead: string
  avantages: string[]
  faq: { q: string; r: string }[]
  riskFocus: string
  preparationHint: string
  relatedActivitySlugs: string[]
}

function getActivityBySlugOrThrow(slug: string): DecennaleSeoEntry {
  const item = ACTIVITY_ENTRIES.find((entry) => entry.slug === slug)
  if (!item) {
    throw new Error(`DECENNALE_ACTIVITY_NOT_FOUND:${slug}`)
  }
  return item
}

const HEADTERM_SEEDS: HeadtermSeed[] = [
  {
    slug: "plombier",
    nom: "Plombier",
    activite: "Plomberie / chauffage",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour plombier et plombier-chauffagiste : installations sanitaires, chauffage, canalisations et réseaux hydrauliques.",
    avantages: [
      "Page métier claire avant de descendre vers l'activité exacte à déclarer",
      "Accès rapide aux activités plomberie, chauffage et réseaux les plus proches",
      "Devis en ligne avec préremplissage métier pour démarrer rapidement",
    ],
    faq: [
      {
        q: "Un plombier doit-il avoir une assurance décennale ?",
        r: "Oui dès lors qu'il réalise des travaux relevant de la responsabilité décennale avec un contrat direct sur l'ouvrage. L'attestation reste généralement exigée avant le démarrage du chantier.",
      },
      {
        q: "Quelles activités déclarer quand on est plombier ?",
        r: "Le plus souvent : plomberie sanitaire, chauffage central, chauffage gaz, réseaux hydrauliques ou autres activités proches réellement exercées. Il faut déclarer précisément vos travaux pour éviter un décalage entre le devis et l'attestation.",
      },
    ],
    riskFocus: "fuites, étanchéité, réseaux encastrés, chauffage et conformité des installations",
    preparationHint:
      "renseignez clairement vos travaux de plomberie sanitaire, de chauffage et les réseaux réellement exécutés sur chantier",
    relatedActivitySlugs: [
      "plomberie-sanitaire",
      "chauffage-central",
      "chauffage-gaz",
      "reseaux-hydrauliques",
    ],
  },
  {
    slug: "electricien",
    nom: "Électricien",
    activite: "Électricité / courant faible",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour électricien : électricité générale, domotique, courant faible, photovoltaïque et bornes de recharge.",
    avantages: [
      "Regroupement des activités électriques les plus fréquentes",
      "Orientation claire entre activité principale et options complémentaires",
      "Parcours devis adapté aux installations électriques et techniques",
    ],
    faq: [
      {
        q: "Un électricien doit-il être couvert en décennale ?",
        r: "Oui lorsque les travaux relèvent de la responsabilité décennale et qu'ils sont réalisés dans le cadre d'un contrat direct sur l'ouvrage. L'attestation est souvent demandée avant intervention.",
      },
      {
        q: "Électricité, domotique et photovoltaïque peuvent-ils être séparés ?",
        r: "Oui. Il est préférable de déclarer précisément les activités effectivement réalisées : électricité générale, courant faible, domotique, bornes ou photovoltaïque selon votre périmètre réel.",
      },
    ],
    riskFocus: "sécurité des installations, conformité des réseaux, raccordements et équipements techniques",
    preparationHint:
      "distinguez bien l'électricité générale, les courants faibles, la domotique et les autres lots techniques réellement posés",
    relatedActivitySlugs: [
      "electricite-generale",
      "courants-faibles",
      "domotique",
      "photovoltaique",
      "bornes-recharge",
    ],
  },
  {
    slug: "peintre",
    nom: "Peintre",
    activite: "Peinture / revêtements",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour peintre en bâtiment : peinture intérieure, extérieure et revêtements muraux avec devis en ligne.",
    avantages: [
      "Regroupe les activités de peinture les plus courantes du second œuvre",
      "Aide à distinguer peinture intérieure, extérieure et revêtements",
      "Maillage direct vers devis, guides et activités associées",
    ],
    faq: [
      {
        q: "La décennale s'applique-t-elle au peintre ?",
        r: "Oui pour les travaux relevant de la responsabilité décennale, notamment lorsqu'ils touchent à la protection durable de l'ouvrage ou à des éléments intégrés au bâtiment.",
      },
      {
        q: "Faut-il séparer peinture intérieure et extérieure ?",
        r: "Oui si vous réalisez réellement les deux. Déclarer précisément votre périmètre aide à obtenir un devis cohérent et une attestation adaptée à vos chantiers.",
      },
    ],
    riskFocus: "protection durable des supports, revêtements, finitions extérieures et conformité du périmètre déclaré",
    preparationHint:
      "précisez si vous intervenez en peinture intérieure, extérieure, revêtements muraux ou activités proches",
    relatedActivitySlugs: ["peinture-interieure", "peinture-exterieure", "revetement-mural"],
  },
  {
    slug: "carreleur",
    nom: "Carreleur",
    activite: "Carrelage / faïence",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour carreleur : carrelage, faïence et revêtements durs du second œuvre avec devis en ligne.",
    avantages: [
      "Page métier simple pour les travaux de carrelage et de faïence",
      "Accès rapide aux activités exactes rattachées au métier",
      "Parcours devis pensé pour les lots de finition",
    ],
    faq: [
      {
        q: "Le carreleur est-il concerné par la décennale ?",
        r: "Oui lorsque ses travaux entrent dans le champ de la responsabilité décennale. L'attestation est régulièrement demandée par les maîtres d'ouvrage et donneurs d'ordre.",
      },
      {
        q: "Faut-il déclarer faïence et carrelage ensemble ?",
        r: "Si vous réalisez les deux, mieux vaut le préciser dès le devis pour que le contrat reflète bien la réalité de vos travaux.",
      },
    ],
    riskFocus: "pose, intégration des revêtements, adhérence, supports et conformité du lot finition déclaré",
    preparationHint:
      "distinguez bien carrelage, faïence et autres revêtements durs réellement exécutés",
    relatedActivitySlugs: ["carrelage", "faience"],
  },
  {
    slug: "macon",
    nom: "Maçon",
    activite: "Maçonnerie / gros œuvre",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour maçon : maçonnerie générale, béton armé, coffrage, ferraillage et construction de maison individuelle.",
    avantages: [
      "Regroupe les activités de gros œuvre les plus recherchées",
      "Met en avant le niveau d'exposition structurelle du métier",
      "Aide à choisir l'activité exacte avant devis et attestation",
    ],
    faq: [
      {
        q: "Pourquoi la décennale est-elle incontournable pour un maçon ?",
        r: "Parce que la maçonnerie touche directement à la solidité de l'ouvrage. Sans attestation à jour, il devient difficile de sécuriser un chantier ou une relation maître d'ouvrage.",
      },
      {
        q: "Quelle activité déclarer pour un maçon ?",
        r: "Selon vos travaux réels : maçonnerie générale, béton armé, coffrage, ferraillage ou construction de maison individuelle. Il vaut mieux choisir l'activité la plus fidèle à votre périmètre d'intervention.",
      },
    ],
    riskFocus: "fondations, structure porteuse, béton, stabilité de l'ouvrage et périmètre gros œuvre",
    preparationHint:
      "préparez votre chiffre d'affaires, vos travaux structurels réels et les lots gros œuvre effectivement exécutés",
    relatedActivitySlugs: [
      "maconnerie-generale",
      "beton-arme",
      "coffrage",
      "ferraillage",
      "construction-maison-individuelle",
    ],
  },
  {
    slug: "couvreur",
    nom: "Couvreur",
    activite: "Couverture / zinguerie",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour couvreur : couverture tuiles, ardoises, zinc, bac acier, zinguerie et étanchéité de toiture.",
    avantages: [
      "Regroupe les activités de couverture et d'enveloppe les plus fréquentes",
      "Aide à séparer couverture classique, zinguerie et étanchéité",
      "Accès direct au devis et aux pages activité les plus proches",
    ],
    faq: [
      {
        q: "Un couvreur doit-il avoir une assurance décennale ?",
        r: "Oui, les travaux de toiture et d'enveloppe sont fortement exposés et l'attestation est généralement exigée avant chantier.",
      },
      {
        q: "Faut-il distinguer couverture et étanchéité ?",
        r: "Oui. Couverture tuiles, ardoises, zinc, bac acier, zinguerie ou étanchéité toiture n'impliquent pas exactement le même périmètre métier. Il vaut mieux déclarer l'activité exacte.",
      },
    ],
    riskFocus: "infiltrations, enveloppe, couverture, zinguerie et continuité d'étanchéité de la toiture",
    preparationHint:
      "indiquez précisément si vous faites de la couverture, de la zinguerie, de l'etancheite ou un mix de ces travaux",
    relatedActivitySlugs: [
      "couverture-tuiles",
      "couverture-ardoises",
      "couverture-zinc",
      "couverture-bac-acier",
      "zinguerie",
      "etancheite-toiture",
    ],
  },
  {
    slug: "etancheite",
    nom: "Étanchéité",
    activite: "Étanchéité toiture / terrasse",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour les travaux d'étanchéité : toiture, terrasse et interventions liées à la protection durable de l'ouvrage.",
    avantages: [
      "Regroupe les activités d'étanchéité les plus proches du métier",
      "Clarifie la distinction entre étanchéité toiture et terrasse",
      "Parcours devis orienté technique et risque d'infiltration",
    ],
    faq: [
      {
        q: "Les travaux d'étanchéité nécessitent-ils une assurance décennale ?",
        r: "Oui, car ils touchent directement à la protection durable de l'ouvrage et aux risques d'infiltration. L'attestation est généralement attendue avant intervention sur chantier.",
      },
      {
        q: "Quelle activité choisir entre étanchéité toiture et étanchéité terrasse ?",
        r: "Il faut sélectionner l'activité qui correspond réellement aux travaux exécutés. Si vous intervenez sur les deux, vous pouvez préciser votre périmètre exact au moment du devis.",
      },
    ],
    riskFocus: "infiltrations, continuité d'étanchéité et protection durable de l'enveloppe",
    preparationHint:
      "précisez si vous intervenez surtout sur l'étanchéité de toiture, de terrasse ou les deux selon vos chantiers",
    relatedActivitySlugs: ["etancheite-toiture", "etancheite-terrasse"],
  },
  {
    slug: "menuisier",
    nom: "Menuisier",
    activite: "Menuiserie intérieure / extérieure",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour menuisier : menuiserie intérieure, extérieure, pose de fenêtres et pose de portes.",
    avantages: [
      "Regroupe les principales activités de menuiserie du bâtiment",
      "Aide à distinguer intérieur, extérieur et pose d'ouvertures",
      "Parcours devis simple pour un métier de finition à forte variété",
    ],
    faq: [
      {
        q: "La décennale concerne-t-elle la menuiserie ?",
        r: "Oui, en particulier lorsque les travaux s'intègrent à l'ouvrage et peuvent affecter son usage, son étanchéité ou sa conformité.",
      },
      {
        q: "Quelle activité choisir pour un menuisier ?",
        r: "Menuiserie intérieure, menuiserie extérieure, pose de fenêtres ou pose de portes selon vos travaux réels. Le bon choix dépend de ce que vous réalisez sur chantier.",
      },
    ],
    riskFocus: "ouvrants, intégration à l'ouvrage, menuiseries extérieures et conformité de la pose",
    preparationHint:
      "précisez si vous intervenez surtout en menuiserie intérieure, extérieure ou pose d'ouvertures",
    relatedActivitySlugs: [
      "menuiserie-interieure",
      "menuiserie-exterieure",
      "pose-fenetres",
      "pose-portes",
    ],
  },
  {
    slug: "charpentier",
    nom: "Charpentier",
    activite: "Charpente / ossature bois",
    categorie: "Métier",
    descriptionLead:
      "Assurance décennale pour charpentier : charpente bois, charpente métallique, charpente lamellé-collé et ossature bois.",
    avantages: [
      "Regroupe les activités structurelles les plus proches du métier de charpentier",
      "Clarté sur les différentes formes de charpente et d'ossature",
      "Devis orienté structure avec activité exacte à affiner ensuite",
    ],
    faq: [
      {
        q: "La charpente nécessite-t-elle une assurance décennale ?",
        r: "Oui, la charpente touche directement à la structure de l'ouvrage. L'attestation décennale est un prérequis fréquent avant démarrage de chantier.",
      },
      {
        q: "Quelle différence entre charpente bois, métallique et ossature bois ?",
        r: "Ces activités relèvent du même univers métier mais ne couvrent pas toujours le même périmètre technique. Il est préférable de déclarer précisément la ou les techniques réellement utilisées.",
      },
    ],
    riskFocus: "structure, assemblages, tenue des éléments porteurs et compatibilité de la technique mise en œuvre",
    preparationHint:
      "précisez le type de charpente ou d'ossature réellement posee : bois, metallique, lamelle-colle ou ossature bois",
    relatedActivitySlugs: [
      "charpente-bois",
      "charpente-metallique",
      "charpente-lamelle-colle",
      "ossature-bois",
    ],
  },
]

const HEADTERM_ENTRIES: DecennaleSeoEntry[] = HEADTERM_SEEDS.map((seed) => {
  const relatedEntries = seed.relatedActivitySlugs.map(getActivityBySlugOrThrow)
  const prixMinAnnuel = Math.min(...relatedEntries.map((entry) => entry.prixMinAnnuel))
  const prixMinMensuelEquivalent = Math.max(50, Math.round(prixMinAnnuel / 12))

  return {
    kind: "headterm",
    slug: seed.slug,
    nom: seed.nom,
    activite: seed.activite,
    prixMin: String(prixMinMensuelEquivalent),
    description: `${seed.descriptionLead} Dès ${prixMinMensuelEquivalent} €/mois équivalent, paiement trimestriel.`,
    avantages: seed.avantages,
    faq: seed.faq,
    categorie: seed.categorie,
    activiteSource: relatedEntries[0]?.activiteSource ?? seed.activite,
    prixMinAnnuel,
    prixMinMensuelEquivalent,
    tauxBase: Math.max(...relatedEntries.map((entry) => entry.tauxBase)),
    riskFocus: seed.riskFocus,
    preparationHint: seed.preparationHint,
    relatedActivitySlugs: seed.relatedActivitySlugs,
    prefillActivities: [relatedEntries[0]?.activiteSource ?? seed.activite],
  }
})

export const DECENNALE_SEO_ACTIVITY_ENTRIES = ACTIVITY_ENTRIES
export const DECENNALE_SEO_HEADTERM_ENTRIES = HEADTERM_ENTRIES

export const METIERS_SEO: DecennaleSeoEntry[] = [...HEADTERM_ENTRIES, ...ACTIVITY_ENTRIES]

export const DECENNALE_SEO_CATALOG_BY_SLUG = new Map(
  METIERS_SEO.map((activity) => [activity.slug, activity] as const)
)

export function getDecennaleSeoCatalogItem(slug: string): DecennaleSeoEntry | null {
  return DECENNALE_SEO_CATALOG_BY_SLUG.get(slug) ?? null
}
