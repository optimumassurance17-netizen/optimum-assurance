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
}

export type DecennaleSeoSlug = DecennaleSeoEntry["slug"]

export const METIERS_SEO: DecennaleSeoEntry[] = TARIFICATION_110_ACTIVITES.map((activity) => {
  const prixMinMensuelEquivalent = Math.max(50, Math.round(activity.prime_min / 12))

  return {
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
  }
})

export const DECENNALE_SEO_CATALOG_BY_SLUG = new Map(
  METIERS_SEO.map((activity) => [activity.slug, activity] as const)
)

export function getDecennaleSeoCatalogItem(slug: string): DecennaleSeoEntry | null {
  return DECENNALE_SEO_CATALOG_BY_SLUG.get(slug) ?? null
}
