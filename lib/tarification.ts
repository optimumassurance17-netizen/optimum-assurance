/**
 * Logique de tarification automatique - Assurance décennale
 * Basée sur : tarification_decennale_110_activites_optimum_assurance.pdf
 * Structure : taux_base (% du CA), prime_min (€/an) par activité
 * Stratégie : ~30% sous le marché + réduction 10% par tranche de 100k€ de CA
 */

import { getTarifActivite, TARIF_DEFAULT } from "./tarification-data"

export const CA_MINIMUM = 40_000

export interface DevisInput {
  chiffreAffaires: number
  sinistres: number
  jamaisAssure: boolean
  resilieNonPaiement?: boolean
  activites: string[]
  reprisePasse?: boolean
}

export interface DevisResult {
  primeAnnuelle: number
  primeMensuelle: number
  /** Prime par trimestre (paiement en 4 fois / an) */
  primeTrimestrielle: number
  franchise: number
  plafond: number
  reprisePasse?: boolean
  supplementReprisePasse?: number
  details: {
    base: number
    majorationSinistres: number
    majorationNouveau: number
    majorationActivites: number
    majorationResilie?: number
  }
}

// Offre spécifique : Nettoyage toiture et peinture résine I3 à I5 — taux 1.7% (CA ≤ 250k€) / 2% (CA > 250k€)
const SEUIL_NETTOYAGE_TOITURE = 250_000
const TAUX_NETTOYAGE_TOITURE_SOUS_250K = 1.7
const TAUX_NETTOYAGE_TOITURE_AU_DESSUS_250K = 2

function isOffreNettoyageToiturePeintureResine(activites: string[]): boolean {
  const normalized = activites.map((a) => a.toLowerCase().trim())
  return normalized.includes("nettoyage toiture et peinture résine (i3 à i5)")
}

const MAJORATION_RESILIE_NON_PAIEMENT = 0.1 // 10 %
const MAJORATION_REPRISE_PASSE = 0.4 // 40 % sur les 3 mois rétroactifs
const MOIS_REPRISE_PASSE = 3
const MAJORATION_SINISTRES = 0.15 // 15 % par sinistre (max 3)
const MAJORATION_JAMAIS_ASSURE = 0.25 // 25 %
const REDUCTION_PAR_TRANCHE_100K = 0.1 // 10 % par tranche de 100k€ de CA
const REDUCTION_MAX = 0.3 // 30 % max

export function calculerTarif(input: DevisInput): DevisResult {
  const { chiffreAffaires, sinistres, jamaisAssure, resilieNonPaiement, activites, reprisePasse } = input

  // Offre spécifique : Nettoyage toiture + peinture résine I3 à I5 — 1.7% (CA ≤ 250k€) / 2% (CA > 250k€)
  if (isOffreNettoyageToiturePeintureResine(activites)) {
    const taux = chiffreAffaires > SEUIL_NETTOYAGE_TOITURE ? TAUX_NETTOYAGE_TOITURE_AU_DESSUS_250K : TAUX_NETTOYAGE_TOITURE_SOUS_250K
    const base = (chiffreAffaires * taux) / 100
    let primeAnnuelle = base
    const majorationResilie = resilieNonPaiement
      ? Math.round(primeAnnuelle * MAJORATION_RESILIE_NON_PAIEMENT)
      : 0
    if (resilieNonPaiement) primeAnnuelle = primeAnnuelle * (1 + MAJORATION_RESILIE_NON_PAIEMENT)
    const primeMensuelle = Math.round((primeAnnuelle / 12) * 100) / 100
    let supplementReprisePasse: number | undefined
    if (reprisePasse && sinistres === 0) {
      supplementReprisePasse = Math.round(primeMensuelle * (1 + MAJORATION_REPRISE_PASSE) * MOIS_REPRISE_PASSE * 100) / 100
      primeAnnuelle += supplementReprisePasse
    }
    const primeAnnuelleRounded = Math.round(primeAnnuelle)
    const primeTrimestrielle = Math.round((primeAnnuelleRounded / 4) * 100) / 100
    return {
      primeAnnuelle: primeAnnuelleRounded,
      primeMensuelle: Math.round((primeAnnuelleRounded / 12) * 100) / 100,
      primeTrimestrielle,
      franchise: 2500,
      plafond: Math.max(chiffreAffaires * 2, 100000),
      reprisePasse: reprisePasse && sinistres === 0,
      supplementReprisePasse,
      details: {
        base: Math.round(base),
        majorationSinistres: 0,
        majorationNouveau: 0,
        majorationActivites: 0,
        majorationResilie,
      },
    }
  }

  // Tarification 110 activités : taux_base (% du CA), prime_min
  const tarifs = activites.length > 0
    ? activites.map((a) => getTarifActivite(a) ?? TARIF_DEFAULT)
    : [TARIF_DEFAULT]

  // Prendre le plus risqué (taux_base max) pour les activités multiples
  const tarif = tarifs.reduce((max, t) => (t.taux_base > max.taux_base ? t : max))
  const primeMin = Math.max(...tarifs.map((t) => t.prime_min))

  // Base : max(prime_min, CA * taux_base / 100)
  const baseBrute = (chiffreAffaires * tarif.taux_base) / 100
  const base = Math.max(primeMin, baseBrute)

  // Réduction 10% par tranche de 100k€ de CA (max 30%)
  const tranches100k = Math.floor(chiffreAffaires / 100_000)
  const reduction = Math.min(REDUCTION_MAX, tranches100k * REDUCTION_PAR_TRANCHE_100K)
  let primeAnnuelle = base * (1 - reduction)

  // Majoration sinistres : +15% par sinistre (max 3)
  const sinistresCount = Math.min(sinistres, 3)
  const majorationSinistres = primeAnnuelle * (sinistresCount * MAJORATION_SINISTRES)
  primeAnnuelle += majorationSinistres

  // Majoration "jamais assuré" : +25%
  const majorationNouveau = jamaisAssure ? primeAnnuelle * MAJORATION_JAMAIS_ASSURE : 0
  if (jamaisAssure) primeAnnuelle += majorationNouveau

  // Majoration résilié pour non-paiement : +10%
  const majorationResilie = resilieNonPaiement
    ? Math.round(primeAnnuelle * MAJORATION_RESILIE_NON_PAIEMENT)
    : 0
  if (resilieNonPaiement) primeAnnuelle = primeAnnuelle * (1 + MAJORATION_RESILIE_NON_PAIEMENT)

  primeAnnuelle = Math.round(primeAnnuelle)
  let primeMensuelle = Math.round((primeAnnuelle / 12) * 100) / 100

  // Reprise du passé : 3 mois rétroactifs à +40 %, sous réserve de non sinistralité
  let supplementReprisePasse: number | undefined
  if (reprisePasse && sinistres === 0) {
    supplementReprisePasse = Math.round(primeMensuelle * (1 + MAJORATION_REPRISE_PASSE) * MOIS_REPRISE_PASSE * 100) / 100
    primeAnnuelle += supplementReprisePasse
    primeAnnuelle = Math.round(primeAnnuelle)
    primeMensuelle = Math.round((primeAnnuelle / 12) * 100) / 100
  }

  const primeTrimestrielle = Math.round((primeAnnuelle / 4) * 100) / 100

  // Franchise standard : 5% du CA ou 2500€ min
  const franchise = Math.max(2500, Math.round(chiffreAffaires * 0.05))

  // Plafond de garantie : 2x le CA
  const plafond = chiffreAffaires * 2

  return {
    primeAnnuelle,
    primeMensuelle,
    primeTrimestrielle,
    franchise,
    plafond,
    reprisePasse: reprisePasse && sinistres === 0,
    supplementReprisePasse,
    details: {
      base: Math.round(base),
      majorationSinistres: Math.round(majorationSinistres),
      majorationNouveau: Math.round(majorationNouveau),
      majorationActivites: 0,
      majorationResilie,
    },
  }
}
