export type PendingSignatureFlow = "decennale" | "custom_pdf" | "do_quote"

/** Le devis dommage ouvrage se signe avant le virement unique. */
export function doQuoteRequiresSignature(productType: string | null | undefined): boolean {
  return productType === "do"
}

export function doQuotePaymentAllowed(
  productType: string | null | undefined,
  signedQuoteStorageKey: string | null | undefined
): boolean {
  if (!doQuoteRequiresSignature(productType)) return true
  return typeof signedQuoteStorageKey === "string" && signedQuoteStorageKey.trim().length > 0
}

export function isDoQuoteSignatureData(
  data: Record<string, unknown> | null | undefined
): data is Record<string, unknown> & { doQuoteFlow: true; insuranceContractId: string } {
  if (!data || data.doQuoteFlow !== true) return false
  return typeof data.insuranceContractId === "string" && data.insuranceContractId.trim().length > 0
}

export function signatureFlowFromPendingData(
  data: Record<string, unknown> | null | undefined
): PendingSignatureFlow {
  if (isDoQuoteSignatureData(data)) return "do_quote"
  if (data?.customUploadedDevisFlow === true) return "custom_pdf"
  return "decennale"
}

export function signatureFlowLabel(flow: PendingSignatureFlow, produitLabel?: string | null): string {
  if (flow === "do_quote") return "Devis dommage ouvrage"
  const custom = produitLabel?.trim()
  if (flow === "custom_pdf") return custom || "Document personnalisé"
  return "Contrat décennale"
}

export const DO_QUOTE_SIGNATURE_REQUIRED_ERROR = "Signez le devis avant le virement."
export const DO_QUOTE_AFTER_SIGN_PATH = "/espace-client?suite=do"
