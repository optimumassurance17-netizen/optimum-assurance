/**
 * Identité courtier / assureur et texte légal obligatoire sur les documents PDF.
 * Ne pas dupliquer ces chaînes ailleurs — importer depuis ce module.
 */
export const COMPANY_BRAND = "Optimum Courtage"
export const INSURER_NAME = "Accelerant Insurance"
export const ORIAS_NUMBER = "LPS 28931947"

/** Texte légal obligatoire (attestations, factures, etc.) */
export const LEGAL_DELEGATION_MANDATORY =
  "Optimum Courtage agit par délégation de Accelerant Insurance"

export const LEGAL_ORIAS_LINE = `${COMPANY_BRAND} – ORIAS ${ORIAS_NUMBER}`

export const LEGAL_FOOTER_LINES = [LEGAL_ORIAS_LINE, LEGAL_DELEGATION_MANDATORY] as const

/** Libellé facture acquittée — conforme au mandat / échéancier */
export const INVOICE_PAYMENT_METHOD_PRIMARY = "Prélèvement SEPA"

/** Précision pour la prime initiale réglée via la plateforme (Mollie) */
export const INVOICE_FIRST_SETTLEMENT_NOTE =
  "Règlement de la prime initiale : virement bancaire sécurisé (Mollie)."
