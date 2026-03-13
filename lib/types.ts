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
  paiementOptions: "optimum-paiement-options",
}

export const FRAIS_GESTION_PRELEVEMENT = 60
export const FRAIS_AVENANT = 60

export type PeriodicitePrelevement = "mensuel" | "trimestriel"
