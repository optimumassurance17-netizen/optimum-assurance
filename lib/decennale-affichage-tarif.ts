/**
 * Affichage marketing décennale : équivalent mensuel (prime annuelle ÷ 12),
 * aligné sur `calculerTarif` (arrondi à 2 décimales).
 * Le paiement contractuel reste trimestriel (SEPA / 1er trimestre CB).
 */

/** Arrondi identique à `lib/tarification.ts` pour la prime mensuelle affichée */
export function equivMensuelDepuisAnnuel(primeAnnuelle: number): number {
  return Math.round((primeAnnuelle / 12) * 100) / 100
}

/** Équivalent d’un montant trimestriel en « mensuel » (prime trimestre × 4 / 12 = trimestre / 3) — utile pour relecture croisée */
export function equivMensuelDepuisTrimestre(primeTrimestrielle: number): number {
  return equivMensuelDepuisAnnuel(primeTrimestrielle * 4)
}

export function primeTrimestrielleDepuisAnnuel(primeAnnuelle: number): number {
  return Math.round((primeAnnuelle / 4) * 100) / 100
}

export const LEGENDE_EQ_MENSUEL = "équivalent mensuel (prime annuelle ÷ 12)"
export const LEGENDE_PAIEMENT_TRIMESTRIEL =
  "Paiement par prélèvement trimestriel : 1er trimestre par carte (+ frais), puis SEPA."

/** Version courte (cartes, sous-titres) */
export const LEGENDE_PAIEMENT_TRIMESTRIEL_COURT =
  "Prélèvement trimestriel — pas de paiement mensuel."

/** Prime annuelle minimale décennale (hors offres spécifiques) */
export const PRIME_MIN_ANNUELLE = 600

/** Équivalent mensuel de la prime min. (= PRIME_MIN_ANNUELLE / 12, arrondi) */
export const EQ_MENSUEL_MIN = equivMensuelDepuisAnnuel(PRIME_MIN_ANNUELLE)

/**
 * Exemple marketing : offre nettoyage toiture & peinture résine (carte accueil).
 * 1 132 €/an → mensuel et trimestre cohérents avec la tarification.
 */
export const PRIME_ANNUELLE_EXEMPLE_NETTOYAGE_TOITURE = 1132
export const EQ_MENSUEL_EXEMPLE_NETTOYAGE_TOITURE = equivMensuelDepuisAnnuel(
  PRIME_ANNUELLE_EXEMPLE_NETTOYAGE_TOITURE
)
export const PRIME_TRIMESTRIELLE_EXEMPLE_NETTOYAGE_TOITURE =
  primeTrimestrielleDepuisAnnuel(PRIME_ANNUELLE_EXEMPLE_NETTOYAGE_TOITURE)

/** Comparez et économisez (exemple CA 80k plomberie) — montants annuels de référence */
export const EXEMPLE_COMPARAISON_ANNUEL_TRADITIONNEL = 1200
export const EXEMPLE_COMPARAISON_ANNUEL_OPTIMUM = 840
export const EXEMPLE_COMPARAISON_ECONOMIE_ANNUELLE =
  EXEMPLE_COMPARAISON_ANNUEL_TRADITIONNEL - EXEMPLE_COMPARAISON_ANNUEL_OPTIMUM

export const EQ_MENSUEL_EXEMPLE_TRADITIONNEL = equivMensuelDepuisAnnuel(
  EXEMPLE_COMPARAISON_ANNUEL_TRADITIONNEL
)
export const EQ_MENSUEL_EXEMPLE_OPTIMUM = equivMensuelDepuisAnnuel(EXEMPLE_COMPARAISON_ANNUEL_OPTIMUM)
export const EQ_MENSUEL_EXEMPLE_ECONOMIE = equivMensuelDepuisAnnuel(
  EXEMPLE_COMPARAISON_ECONOMIE_ANNUELLE
)

/** Affichage prix en euros, virgule française */
export function formatEurosFR(
  montant: number,
  opts?: { minFrac?: number; maxFrac?: number }
): string {
  const minFrac = opts?.minFrac ?? 0
  const maxFrac = opts?.maxFrac ?? 2
  return montant.toLocaleString("fr-FR", {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  })
}
