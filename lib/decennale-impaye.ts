/**
 * Impayé / suspension pour défaut de paiement : **décennale uniquement** (`type === "attestation"`).
 *
 * L’attestation **dommage ouvrage** (`attestation_do`) suit un paiement **unique** avant délivrance
 * (facture acquittée) : elle n’entre pas dans le parcours impayé / régularisation CB.
 */
export function isDecennaleAttestationType(documentType: string): boolean {
  return documentType === "attestation"
}
