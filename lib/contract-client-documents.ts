import {
  INVOICE_FIRST_SETTLEMENT_NOTE,
  INVOICE_PAYMENT_METHOD_PRIMARY,
} from "@/lib/legal-branding"

/** Type affiché dans l'espace client pour un PDF de contrat plateforme. */
export function clientDocumentTypeForStoredPdf(productType: string, docType: string): string {
  if (docType === "quote") return productType === "do" ? "devis_do" : "devis_cp"
  if (docType === "policy") return "conditions_particulieres"
  if (docType === "certificate") {
    if (productType === "do") return "attestation_do"
    if (productType === "rc_fabriquant") return "attestation_rc"
    return "attestation"
  }
  if (docType === "invoice") {
    if (productType === "do") return "facture_do"
    if (productType === "rc_fabriquant") return "facture_rc"
    return "facture_decennale"
  }
  if (docType === "schedule") return "echeancier"
  if (docType === "fic") return "fic"
  return `contrat_${docType}`
}

/** Libellé de règlement imprimé sur la facture du contrat. */
export function invoiceSettlementCopy(productType: string): { method: string; note: string } {
  if (productType === "rc_fabriquant") {
    return {
      method: "Virement bancaire",
      note: "Règlement de l'échéance RC fabriquant par virement bancaire.",
    }
  }
  return {
    method: INVOICE_PAYMENT_METHOD_PRIMARY,
    note: INVOICE_FIRST_SETTLEMENT_NOTE,
  }
}
