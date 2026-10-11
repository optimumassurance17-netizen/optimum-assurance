import { formatDoConstructionCostActivity } from "@/lib/do-attestation-facts"

const EDITABLE_TYPES = new Set(["contrat", "avenant", "devis", "devis_do"])

const TEXT_KEYS = new Set([
  "motifAvenant",
  "dateEffet",
  "dateEcheance",
  "raisonSociale",
  "siret",
  "adresse",
  "codePostal",
  "ville",
  "email",
  "telephone",
  "representantLegal",
  "civilite",
  "modePaiement",
  "periodicitePrelevement",
  "adresseOperation",
  "projectAddress",
  "adresseConstruction",
  "typeConstruction",
  "destination",
])

const MONEY_KEYS = new Set([
  "chiffreAffaires",
  "primeAnnuelle",
  "primeMensuelle",
  "primeTrimestrielle",
  "fraisGestionPrelevement",
  "franchise",
  "plafond",
  "coutConstruction",
  "montantGaranties",
  "fraisGestion",
  "fraisCourtage",
])

const LOCKED_CONTRACT_STATUSES = new Set(["valide", "suspendu", "active"])
const COST_ACTIVITY_LINE = /co[uû]t\s+construction\s*:/i

export function isGestionEditableDocumentType(type: string): boolean {
  return EDITABLE_TYPES.has(type)
}

function asMoney(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed.replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : undefined
}

function asActivities(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (typeof value !== "string") return undefined
  return value
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Champs qu'un administrateur peut écrire sur un devis, un contrat ou un avenant. */
export function filterGestionDocumentPatch(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {}
  const source = input as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue
    if (key === "activites") {
      const activities = asActivities(value)
      if (activities) patch.activites = activities
      continue
    }
    if (MONEY_KEYS.has(key)) {
      const amount = asMoney(value)
      if (amount !== undefined) patch[key] = amount
      continue
    }
    if (TEXT_KEYS.has(key) && typeof value === "string") {
      patch[key] = value.trim()
    }
  }
  return patch
}

/**
 * Un devis DO enregistré depuis la fiche garde la même adresse de construction
 * et le même montant de garantie sur le document imprimé.
 */
export function alignDoDevisStoredData(
  type: string,
  merged: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  if (type !== "devis_do") return merged
  const next = { ...merged }
  if ("adresseOperation" in patch) {
    const address = typeof patch.adresseOperation === "string" ? patch.adresseOperation.trim() : ""
    next.adresseOperation = address
    next.projectAddress = address
    next.adresseConstruction = address
  }
  if (typeof patch.coutConstruction === "number" && Number.isFinite(patch.coutConstruction)) {
    next.coutConstruction = patch.coutConstruction
    const activities = Array.isArray(next.activites)
      ? next.activites.filter((item): item is string => typeof item === "string")
      : []
    next.activites = [
      ...activities.filter((item) => !COST_ACTIVITY_LINE.test(item)),
      formatDoConstructionCostActivity(patch.coutConstruction),
    ]
  }
  return next
}

/** La couverture d'un contrat déjà en vigueur ne bouge que si la fiche l'autorise. */
export function isContractCoverageLocked(
  type: string,
  status: string | null | undefined,
  allowDevisEdition: boolean
): boolean {
  if (allowDevisEdition) return false
  if (type !== "contrat") return false
  return LOCKED_CONTRACT_STATUSES.has((status || "").trim().toLowerCase())
}
