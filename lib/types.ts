import type { DevisResult } from "./tarification"

export interface DevisData {
  siret: string
  chiffreAffaires: number
  sinistres: number
  jamaisAssure: boolean
  resilieNonPaiement?: boolean
  reprisePasse?: boolean
  /** Date de création de la société (AAAA-MM-JJ) - requis si jamaisAssure, pour attestation non sinistralité */
  dateCreationSociete?: string
  activites: string[]
  /** Exclusions d'activité déclarées au contrat (hors périmètre couvert) */
  exclusionsActivites?: string[]
  tarif?: DevisResult
  montantIndemnisations?: number
  releveSinistraliteNom?: string
}

export interface SouscriptionData extends DevisData {
  raisonSociale: string
  adresse: string
  codePostal: string
  ville: string
  email: string
  telephone: string
  representantLegal: string
  civilite: "M" | "Mme" | "Mlle"
  /** Parcours signature / récap (optionnel) */
  insuranceProduct?: "decennale" | "do"
  doProjectName?: string
  doProjectAddress?: string
}

/** Souscription plateforme — dommage ouvrage (sessionStorage → création contrat + Paiement). */
export interface DoSouscriptionInsurancePayload {
  productType: "do"
  siret: string
  raisonSociale: string
  adresse: string
  codePostal: string
  ville: string
  email: string
  telephone: string
  representantLegal?: string
  civilite?: "M" | "Mme" | "Mlle"
  dateCreationSociete?: string
  premium: number
  projectName: string
  projectAddress: string
  constructionNature?: string
}

export interface MandatSepaData {
  iban: string
  bic?: string
  titulaireCompte: string
  accepteMandat: boolean
}

export const STORAGE_KEYS = {
  devis: "optimum-devis",
  souscription: "optimum-souscription",
  signature: "optimum-signature",
  mandatSepa: "optimum-mandat-sepa",
  paiementOptions: "optimum-paiement-options",
  /** Contrat plateforme (Prisma) créé après souscription */
  insuranceContract: "optimum-insurance-contract",
  /** Id contrat déjà créé dans cet onglet — évite un doublon POST /contracts/create */
  insuranceContractSessionCreatedId: "optimum-insurance-contract-session-created-id",
  /** Brouillon souscription DO avant création de compte */
  doSouscription: "optimum-do-souscription",
}

export const FRAIS_GESTION_PRELEVEMENT = 60
export const FRAIS_AVENANT = 60

/** Unique mode : trimestriel (1er paiement CB + frais, puis prélèvements SEPA trimestriels). */
export type PeriodicitePrelevement = "trimestriel"
