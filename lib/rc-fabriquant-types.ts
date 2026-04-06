export type RcTypeProduit = "alimentaire" | "industriel" | "cosmetique" | "electronique" | "batterie"

export type RcZoneDistribution = "France" | "Europe" | "Monde"

/**
 * Données formulaire « demande de devis RC Fabriquant » (étude manuelle).
 */
export interface DevisRcFabriquantData {
  raisonSociale: string
  /** 14 chiffres (SIREN+NIC), sans espaces côté API */
  siret: string
  telephone: string
  /** Nature des produits / procédés fabriqués */
  activiteFabrication: string
  anneeCreation?: number

  typeProduit?: RcTypeProduit
  zoneDistribution?: RcZoneDistribution
  sousTraitance?: boolean
  controleQualite?: boolean
  certification?: boolean
  testsSecurite?: boolean

  /** CA annuel total estimé (€) */
  caAnnuelTotal?: number
  caExport?: number

  sinistres5Ans?: number
  montantSinistres?: number

  effectifs?: string
  /** Précision libre en complément de la zone (pays, canaux…) */
  zonesCommercialisation?: string
  message?: string
}
