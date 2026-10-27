/** Suppression manuelle d'un contrat créé par erreur (espace gestion). */

export const ERRONEOUS_CONTRACT_DELETE_ACTION = "gestion_contract_deleted_after_error"

export function isErroneousContractDocumentType(type: string): boolean {
  return type === "contrat"
}

export function erroneousContractDeleteConfirm(contractNumber: string, paid: boolean): string {
  const lines = [
    `Supprimer définitivement le contrat ${contractNumber} ?`,
    "À utiliser seulement si ce contrat a été créé par erreur.",
    "Les attestations, les factures et les encaissements Mollie restent.",
  ]
  if (paid) {
    lines.push("Les échéances liées à ce contrat sont aussi retirées.")
  }
  return lines.join(" ")
}
