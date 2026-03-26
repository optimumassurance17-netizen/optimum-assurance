/**
 * Liste des activités du BTP pour l'assurance décennale
 * Source : tarification_decennale_110_activites_optimum_assurance.pdf
 * + offre spécifique Nettoyage toiture et peinture résine (I3 à I5)
 */

import { TARIFICATION_110_ACTIVITES } from "./tarification-data"

/** Activités triées par catégorie puis par nom */
const ACTIVITES_PAR_CATEGORIE = [...TARIFICATION_110_ACTIVITES].sort(
  (a, b) => a.categorie.localeCompare(b.categorie) || a.activite.localeCompare(b.activite)
)

/** Liste plate des 110 activités + offre spécifique */
export const ACTIVITES_BTP = [
  ...ACTIVITES_PAR_CATEGORIE.map((t) => t.activite),
  "Nettoyage toiture et peinture résine (I3 à I5)",
] as const

export type ActiviteBtp = (typeof ACTIVITES_BTP)[number]

/** Activités avec taux et prime min — pour le simulateur (afficher les tarifs) */
export const ACTIVITES_AVEC_TARIFS = [
  ...ACTIVITES_PAR_CATEGORIE,
  { activite: "Nettoyage toiture et peinture résine (I3 à I5)", categorie: "Spécialisé", taux_base: 1.7, prime_min: 0 }, // 1.7% (CA ≤ 250k€) / 2% (CA > 250k€)
] as const
