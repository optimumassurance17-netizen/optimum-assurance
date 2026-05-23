import type { MetierSeoEntry } from "@/lib/metiers-seo"

type ExpertContent = {
  riskLines: string[]
  documentLines: string[]
  declarationTips: string[]
  cityLinks: { href: string; label: string }[]
}

const PRIORITY_CITIES = [
  { slug: "paris", name: "Paris" },
  { slug: "lyon", name: "Lyon" },
  { slug: "marseille", name: "Marseille" },
  { slug: "toulouse", name: "Toulouse" },
  { slug: "bordeaux", name: "Bordeaux" },
  { slug: "lille", name: "Lille" },
] as const

function categorySpecificDocuments(category: string): string[] {
  switch (category) {
    case "Gros œuvre":
    case "Structure":
      return [
        "description des ouvrages structurels réellement exécutés",
        "qualification ou expérience sur les travaux porteurs lorsque disponible",
        "éléments de chantier utiles : nature des supports, fondations, béton, bois ou métal",
      ]
    case "Toiture":
      return [
        "type de couverture ou d’étanchéité réalisée",
        "précisions sur les supports, pentes, terrasses ou interventions en rénovation",
        "historique de sinistralité lié aux infiltrations si le dossier en comporte",
      ]
    case "Technique":
      return [
        "détail des lots techniques : plomberie, électricité, CVC, réseaux ou équipements",
        "distinction entre pose, maintenance, raccordement et mise en service",
        "attestations ou habilitations lorsque le chantier les exige",
      ]
    case "PIB":
      return [
        "nature exacte des missions : conception, maîtrise d’œuvre, BET ou coordination",
        "périmètre contractuel et niveau d’intervention sur l’ouvrage",
        "chiffre d’affaires lié aux missions intellectuelles du bâtiment",
      ]
    default:
      return [
        "liste précise des travaux réellement réalisés",
        "chiffre d’affaires annuel déclaré ou prévisionnel",
        "antécédents : sinistres, résiliation, reprise du passé ou non-sinistralité",
      ]
  }
}

function categorySpecificTips(category: string): string[] {
  switch (category) {
    case "Gros œuvre":
    case "Structure":
      return [
        "ne pas mélanger travaux porteurs et simples aménagements si le contrat ne couvre pas les deux",
        "déclarer les interventions sur fondations, murs porteurs, dallages ou structure dès le devis",
        "signaler tout procédé non courant ou sous-traitance importante",
      ]
    case "Toiture":
      return [
        "séparer couverture, zinguerie, étanchéité toiture et étanchéité terrasse selon vos chantiers",
        "indiquer les travaux en rénovation lorsque vous intervenez sur existant",
        "éviter les libellés trop génériques si vous faites plusieurs techniques de toiture",
      ]
    case "Technique":
      return [
        "déclarer chaque lot réellement exécuté : réseau, appareil, raccordement ou équipement",
        "préciser les activités complémentaires comme chauffage, climatisation, ventilation ou courant faible",
        "ne pas déclarer une activité technique que vous ne réalisez pas vous-même",
      ]
    case "PIB":
      return [
        "décrire la mission réelle plutôt qu’un titre générique",
        "distinguer conseil, conception, maîtrise d’œuvre complète et simple assistance",
        "signaler les missions avec visa, direction d’exécution ou coordination technique",
      ]
    default:
      return [
        "choisir les activités les plus proches des travaux facturés",
        "déclarer les exclusions ou limites de périmètre avant signature",
        "mettre à jour le contrat si votre activité évolue en cours d’année",
      ]
  }
}

export function buildActivityExpertContent(activity: MetierSeoEntry): ExpertContent {
  const activityName = activity.nom.toLowerCase()
  return {
    riskLines: [
      `Le point clé pour ${activityName} est d’obtenir une attestation qui reprend correctement le périmètre de travaux réalisé.`,
      `Risque principal à cadrer : ${activity.riskFocus}.`,
      `Le tarif dépend notamment du chiffre d’affaires, de la sinistralité, de l’ancienneté et des activités effectivement déclarées.`,
    ],
    documentLines: [
      "SIRET, raison sociale, adresse et représentant légal",
      ...categorySpecificDocuments(activity.categorie),
    ],
    declarationTips: categorySpecificTips(activity.categorie),
    cityLinks: PRIORITY_CITIES.map((city) => ({
      href: `/assurance-decennale/${activity.slug}/${city.slug}`,
      label: `${activity.nom} à ${city.name}`,
    })),
  }
}
