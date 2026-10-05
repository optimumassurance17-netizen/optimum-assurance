import {
  GARANTIES_LABELS,
  QUALITES_MAITRE_OUVRAGE,
  TYPES_CONTRAT,
  TYPES_OUVRAGE,
  type DevisDommageOuvrageData,
  type DestinationConstruction,
  type GarantieSouhaitee,
} from "@/lib/dommage-ouvrage-types"

const DESTINATION_LABELS: Record<DestinationConstruction, string> = {
  location: "Location",
  vente: "Vente",
  exploitation_directe: "Exploitation directe",
}

const PENTE_LABELS: Record<NonNullable<DevisDommageOuvrageData["penteTerrain"]>, string> = {
  inf15: "Inférieure à 15 %",
  sup15: "Entre 15 % et 30 %",
  sup30: "Supérieure à 30 %",
}

function euro(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} EUR`
}

function add(lines: string[], label: string, value: string | null | undefined) {
  const normalized = value?.trim()
  if (!normalized) return
  lines.push(`${label} : ${normalized}`)
}

function ouiNon(value: boolean | undefined): string | null {
  if (value == null) return null
  return value ? "Oui" : "Non"
}

/**
 * Lignes d'opération reprises du questionnaire d'étude, pour les devis et contrats générés.
 * N'inclut aucun taux de prime.
 */
export function buildDoOperationLines(
  data: Partial<DevisDommageOuvrageData>,
  coutTotal?: number
): string[] {
  const lines: string[] = []
  const qualite = QUALITES_MAITRE_OUVRAGE.find((item) => item.value === data.qualiteMaitreOuvrage)?.label
  add(lines, "Qualité du maître d'ouvrage", qualite)
  add(lines, "Le maître d'ouvrage est le souscripteur", ouiNon(data.maitreOuvrageEstSouscripteur))
  add(lines, "Téléphone", data.telephone)
  add(lines, "Permis de construire", data.permisConstruireNumero)
  add(lines, "Ouverture de chantier prévue", data.dateDroc)
  add(lines, "Début des travaux", data.dateDebutTravaux)
  add(lines, "Achèvement prévu", data.dateAchevementTravaux)
  add(lines, "Type de construction", TYPES_OUVRAGE.find((item) => item.value === data.typeOuvrage)?.label)
  if (typeof data.superficieOuvrage === "number" && data.superficieOuvrage > 0) {
    add(lines, "Superficie", `${data.superficieOuvrage.toLocaleString("fr-FR")} m²`)
  }
  add(
    lines,
    "Destination",
    data.destinationConstruction ? DESTINATION_LABELS[data.destinationConstruction] : undefined
  )
  add(lines, "Clos et couvert", ouiNon(data.operationClosCouvert))
  add(lines, "Habitation principale ou secondaire", ouiNon(data.habitationPrincipaleSecondaire))
  if (typeof data.nbBatiments === "number") add(lines, "Nombre de bâtiments", String(data.nbBatiments))
  if (typeof data.nbLogements === "number") add(lines, "Nombre de logements", String(data.nbLogements))
  if (typeof data.nbEtages === "number") add(lines, "Nombre d'étages", String(data.nbEtages))
  if (typeof data.nbSousSols === "number") add(lines, "Nombre de sous-sols", String(data.nbSousSols))
  add(lines, "Piscine", ouiNon(data.piscines))
  add(lines, "Pente du terrain", data.penteTerrain ? PENTE_LABELS[data.penteTerrain] : undefined)
  if (typeof coutTotal === "number" && Number.isFinite(coutTotal) && coutTotal > 0) {
    add(lines, "Coût prévisionnel de l'opération", euro(coutTotal))
  }
  add(lines, "Base de déclaration", data.coutTvaIncluse == null ? null : data.coutTvaIncluse ? "TTC" : "HT")
  const postes: Array<[string, number | undefined]> = [
    ["Travaux y compris VRD privatifs", data.coutTravauxVrd],
    ["Matériaux fournis par le maître d'ouvrage", data.coutMateriauxMaitreOuvrage],
    ["Honoraires contrôle technique", data.coutControleTechnique],
    ["Honoraires étude de sol", data.coutEtudeSol],
    ["Honoraires maîtrise d'œuvre", data.coutMaitriseOeuvre],
  ]
  for (const [label, amount] of postes) {
    if (typeof amount === "number" && amount > 0) add(lines, label, euro(amount))
  }
  if (typeof data.existantsValeurApproximative === "number" && data.existantsValeurApproximative > 0) {
    add(lines, "Montant des existants", euro(data.existantsValeurApproximative))
  }
  add(lines, "Technique courante", ouiNon(data.techniqueCourante))
  add(lines, "Étude de sol", ouiNon(data.etudeSol))
  if (data.controleTechnique === true) {
    add(lines, "Contrôle technique", data.controleTechniqueNom?.trim() || "Oui")
  } else if (data.controleTechnique === false) {
    add(lines, "Contrôle technique", "Non")
  }
  add(lines, "Maître d'œuvre", data.maitriseOeuvreNom)
  if (data.garanties?.length) {
    add(
      lines,
      "Garanties souhaitées",
      data.garanties.map((garantie) => GARANTIES_LABELS[garantie as GarantieSouhaitee] ?? garantie).join(", ")
    )
  }
  add(lines, "Type de marché", TYPES_CONTRAT.find((item) => item.value === data.typeContrat)?.label)
  return lines
}
