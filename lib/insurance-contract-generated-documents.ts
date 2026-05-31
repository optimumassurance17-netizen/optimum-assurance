import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"

export type InsuranceContractGeneratedDocType =
  | "quote"
  | "policy"
  | "certificate"
  | "invoice"

type MinimalGeneratedDocContract = {
  productType: string
  status: string
}

/**
 * Documents contractuels générés côté plateforme.
 * Assurance titre :
 * - devis + contrat dès création du dossier,
 * - facture dès validation assureur,
 * - attestation seulement après activation/paiement.
 */
export function requiredGeneratedDocTypesForContract(
  contract: MinimalGeneratedDocContract
): InsuranceContractGeneratedDocType[] {
  if (contract.productType === "do") {
    return ["quote", "policy", "certificate", "invoice"]
  }

  if (contract.productType === "assurance_titre") {
    if (contract.status === CONTRACT_STATUS.active) {
      return ["quote", "policy", "invoice", "certificate"]
    }
    if (contract.status === CONTRACT_STATUS.approved) {
      return ["quote", "policy", "invoice"]
    }
    return ["quote", "policy"]
  }

  return []
}
