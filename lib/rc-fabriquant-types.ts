/**
 * Données formulaire « demande de devis RC Fabriquant » (étude manuelle).
 */
export interface DevisRcFabriquantData {
  raisonSociale: string
  siret?: string
  telephone: string
  /** Nature des produits / procédés fabriqués */
  activiteFabrication: string
  /** Chiffre d'affaires annuel estimé (€) */
  chiffreAffairesAnnuel?: number
  /** Effectif approximatif */
  effectifs?: string
  /** Export hors UE, USA, etc. */
  zonesCommercialisation?: string
  /** Contexte complémentaire */
  message?: string
}
