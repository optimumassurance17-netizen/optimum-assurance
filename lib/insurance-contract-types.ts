/**
 * Types partagés — contrats plateforme (Prisma) côté client / API.
 */

export type InsuranceContractListItem = {
  id: string
  contractNumber: string
  status: string
  premium: number
  productType: string
  clientName: string
  createdAt: string
  paidAt: string | null
  rejectedReason: string | null
}

/** Snapshot sessionStorage après création (parcours souscription / signature). */
export type InsuranceContractSnapshot = {
  contractId: string
  contractNumber: string
  status: string
  rejectedReason?: string | null
  /** Décennale : signature → mandat → paiement trimestriel (pas de virement annuel avant). DO : virement contrat plateforme si approuvé. */
  productType?: "decennale" | "do"
}
