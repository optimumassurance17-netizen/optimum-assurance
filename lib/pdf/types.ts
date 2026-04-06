/**
 * Données strictes pour les documents d'assurance (décennale & dommages-ouvrage).
 */

export type ProductType = "decennale" | "do"

export type InsuranceData = {
  productType: ProductType
  clientName: string
  siret?: string
  /** Adresse du siège / assuré */
  address: string
  /** Décennale : activités couvertes */
  activities?: string[]
  /** Activités / travaux exclus du périmètre (mention contractuelle) */
  activityExclusions?: string[]
  /** DO : désignation du chantier / opération */
  projectName?: string
  /** DO : adresse du chantier */
  projectAddress?: string
  /** DO : nature des travaux / construction */
  constructionNature?: string
  startDate: string
  endDate: string
  premium: number
  contractNumber: string
  createdAt: string
}

/** Contexte obligatoire pour générer une attestation (anti-fraude) */
export type CertificateEligibility = {
  paymentConfirmed: boolean
  insurerValidated: boolean
}

export type InsuranceCertificateData = InsuranceData & CertificateEligibility
