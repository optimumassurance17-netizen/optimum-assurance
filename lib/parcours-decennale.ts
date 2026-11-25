export type IndicesParcoursDecennale = {
  hasUserAccount: boolean
  hasPendingSignature: boolean
  hasDecennaleContract: boolean
  hasPaidPayment: boolean
  hasSignedContractDocument: boolean
}

export type StatutParcoursDecennale = "abandonne" | "en_cours" | "abouti"

export const PARCOURS_DECENNALE_VIDE: IndicesParcoursDecennale = {
  hasUserAccount: false,
  hasPendingSignature: false,
  hasDecennaleContract: false,
  hasPaidPayment: false,
  hasSignedContractDocument: false,
}

export function emailParcours(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}

/**
 * Un devis décennale sans compte, sans signature et sans contrat est un parcours abandonné.
 * Un dossier déjà ouvert ou payé n'est plus un devis à relancer.
 */
export function statutParcoursDecennale(indices: IndicesParcoursDecennale): StatutParcoursDecennale {
  if (indices.hasPaidPayment || indices.hasDecennaleContract || indices.hasSignedContractDocument) {
    return "abouti"
  }
  if (indices.hasUserAccount || indices.hasPendingSignature) return "en_cours"
  return "abandonne"
}

export function parcoursDecennaleAbandonne(indices: IndicesParcoursDecennale): boolean {
  return statutParcoursDecennale(indices) === "abandonne"
}

export function libelleParcoursDecennale(statut: StatutParcoursDecennale): string {
  if (statut === "abouti") return "Parcours abouti"
  if (statut === "en_cours") return "Parcours en cours"
  return "Parcours abandonné"
}
