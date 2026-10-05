import type { DoEtudeQuestionnaireV1 } from "@/lib/do-etude-questionnaire-types"
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

function ouiNonEtude(value: string | undefined): string | null {
  if (value === "oui") return "Oui"
  if (value === "non") return "Non"
  return null
}

function linesFromEtude(data: DoEtudeQuestionnaireV1): string[] {
  const lines: string[] = []
  const souscripteur = data.souscripteur
  add(lines, "Souscripteur", souscripteur?.nomRaisonSociale)
  add(lines, "Téléphone", souscripteur?.telephone)
  add(
    lines,
    "Qualité du maître d'ouvrage",
    souscripteur?.qualiteMaitreOuvrage === "autre" ? souscripteur.qualiteAutre : souscripteur?.qualiteMaitreOuvrage
  )
  add(lines, "Le maître d'ouvrage est le souscripteur", ouiNonEtude(souscripteur?.maitreOuvrageEstSouscripteur))

  const operation = data.operation
  add(
    lines,
    "Adresse de l'opération",
    [operation?.adresseChantier, operation?.codePostal, operation?.ville].filter(Boolean).join(" ")
  )
  add(lines, "Permis de construire", operation?.permisNumero)
  add(lines, "Ouverture de chantier prévue", operation?.dateDoc)
  add(lines, "Début des travaux", operation?.dateDebutTravaux)
  add(lines, "Achèvement prévu", operation?.dateFinTravaux)

  const projet = data.typeProjet
  add(lines, "Type de construction", projet?.typeBatiment === "autre" ? projet.typeBatimentAutre : projet?.typeBatiment)
  add(lines, "Destination", projet?.destination)
  add(lines, "Superficie", projet?.superficieM2 ? `${projet.superficieM2} m²` : null)
  add(lines, "Nombre de bâtiments", projet?.nbBatiments)
  add(lines, "Nombre d'étages", projet?.nbEtages)
  add(lines, "Piscine", ouiNonEtude(projet?.piscine))
  add(lines, "Photovoltaïque", ouiNonEtude(projet?.photovoltaiques))

  const cout = data.cout
  add(lines, "Coût prévisionnel de l'opération", cout?.coutTotalTtc ? `${cout.coutTotalTtc} EUR TTC` : null)
  add(lines, "Travaux y compris VRD privatifs", cout?.dontTravaux ? `${cout.dontTravaux} EUR` : null)
  add(lines, "Honoraires maîtrise d'œuvre", cout?.dontHonorairesMO ? `${cout.dontHonorairesMO} EUR` : null)
  add(lines, "Honoraires étude de sol", cout?.dontEtudeSol ? `${cout.dontEtudeSol} EUR` : null)
  add(lines, "Honoraires contrôle technique", cout?.dontControleTechnique ? `${cout.dontControleTechnique} EUR` : null)

  const tech = data.tech
  add(lines, "Type de fondation", tech?.typeFondation === "autre" ? tech.typeFondationAutre : tech?.typeFondation)
  add(lines, "Étude béton armé", ouiNonEtude(tech?.etudeBetonArme))
  add(lines, "Technique courante", ouiNonEtude(tech?.techniqueCourante))
  add(lines, "Produits sous Avis technique ou Atex", ouiNonEtude(tech?.produitsAtex))
  add(lines, "Portée supérieure à 7 mètres", ouiNonEtude(tech?.porteeSup7m))

  const env = data.environnement
  add(lines, "Zone inondable", ouiNonEtude(env?.zoneInondable))
  add(lines, "Sol de remblai", ouiNonEtude(env?.solRemblai))
  add(lines, "Argile gonflante", ouiNonEtude(env?.argileGonflante))
  add(lines, "Nappe phréatique élevée", ouiNonEtude(env?.nappeElevee))
  add(lines, "Pente supérieure à 15 %", ouiNonEtude(env?.penteSup15))

  const travaux = data.travauxSpecifiques
  add(lines, "Travaux sur existants", ouiNonEtude(travaux?.travauxSurExistant))
  add(lines, "Étanchéité spécifique", ouiNonEtude(travaux?.etancheiteSpecifique))
  add(lines, "Intervention sur la structure", ouiNonEtude(travaux?.interventionStructure))
  add(lines, "Surélévation", ouiNonEtude(travaux?.surelevation))
  add(lines, "Désamiantage", ouiNonEtude(travaux?.desamiantage))

  const garanties = data.garanties
  if (garanties) {
    const wanted = [
      garanties.do ? "Dommages ouvrage" : "",
      garanties.trc ? "TRC" : "",
      garanties.rcmo ? "RC maître d'ouvrage" : "",
      garanties.dommagesExistants ? "Dommages aux existants" : "",
    ].filter(Boolean)
    add(lines, "Garanties souhaitées", wanted.join(", "))
  }

  const intervenants = data.intervenants
  add(lines, "Maître d'œuvre", intervenants?.maitriseOeuvreNom)
  add(lines, "Assureur du maître d'œuvre", intervenants?.maitriseOeuvreAssureur)
  add(lines, "Police décennale du maître d'œuvre", intervenants?.maitriseOeuvrePolice)
  add(lines, "Contrôle technique", intervenants?.bureauControleNom)
  add(lines, "Étude de sol", intervenants?.etudeSolSociete)

  for (const lot of data.lots ?? []) {
    const detail = [
      lot.lot,
      lot.entreprise,
      lot.siren ? `SIREN ${lot.siren}` : "",
      lot.assureur ? `assureur ${lot.assureur}` : "",
      lot.police ? `police ${lot.police}` : "",
      lot.montant ? `${lot.montant} EUR` : "",
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ")
    add(lines, "Intervenant", detail)
  }

  return lines
}

/** Relit le questionnaire initial ou le questionnaire d'étude enregistré sur le compte. */
export function buildDoDocumentLinesFromStoredJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== "object") return []
  const record = parsed as Record<string, unknown>
  if (record.version === 1 && record.souscripteur && typeof record.souscripteur === "object") {
    return linesFromEtude(record as unknown as DoEtudeQuestionnaireV1)
  }
  if (typeof record.raisonSociale === "string" || typeof record.adresseConstruction === "string") {
    return buildDoOperationLines(record as Partial<DevisDommageOuvrageData>)
  }
  return []
}
