/**
 * Tarification indicative - Assurance dommage ouvrage
 * Prix approximatifs selon le coût de construction.
 * Prix définitif à la fin de l'étude sous 24h.
 * Chaque palier fourni est réduit de 30 %.
 * Remise web : 5 % sur la part DO, appliquée après cette baisse.
 * Option TRC : +0,4 % du montant du chantier.
 * Option RCMO : +0,2 % du montant du chantier.
 */

/** Franchise dommage ouvrage : aucune (garantie obligatoire — pas de retenue sur sinistre) */
export const FRANCHISE_DOMMAGE_OUVRAGE_EUR = 0

export interface TarifDommageOuvrageResult {
  primeAnnuelle: number
  tranche: string
  isEstimation: true
  remiseWeb?: number
  supplementTrc?: number
  supplementRcmo?: number
}

/** Paliers fournis, avant la baisse de 30 %. */
const PALIERS_FOURNIS = [
  { min: 0, max: 100_000, prix: 1900 },
  { min: 100_000, max: 150_000, prix: 2700 },
  { min: 150_000, max: 250_000, prix: 3200 },
  { min: 250_000, max: 500_000, prix: 4200 },
] as const

const BAISSE_PALIERS_DO = 0.3
const TAUX_FOURNI_AU_DELA_500K = 0.017

const TRANCHES: { min: number; max: number; prix: number }[] = PALIERS_FOURNIS.map((palier) => ({
  min: palier.min,
  max: palier.max,
  prix: Math.round(palier.prix * (1 - BAISSE_PALIERS_DO)),
}))

const TAUX_AU_DELA_500K = TAUX_FOURNI_AU_DELA_500K * (1 - BAISSE_PALIERS_DO) // 1,19 %
const REMISE_WEB_DO = 0.05 // 5% sur la part DO
const TAUX_TRC = 0.004 // 0.4% du montant du chantier
const TAUX_RCMO = 0.002 // 0.2% du montant du chantier

export function calculerTarifDommageOuvrage(
  coutConstruction: number,
  options?: { garanties?: string[] }
): TarifDommageOuvrageResult | null {
  if (coutConstruction <= 0) return null

  const cout = Math.round(coutConstruction)
  const garanties = options?.garanties ?? []
  const avecTrc = garanties.includes("trc")
  const avecRcmo = garanties.includes("rcmo")

  let prime: number | undefined
  let tranche: string | undefined

  for (const t of TRANCHES) {
    if (cout >= t.min && cout < t.max) {
      prime = t.prix
      tranche = `${(t.min / 1000).toFixed(0)} k€ à ${(t.max / 1000).toFixed(0)} k€`
      break
    }
  }

  // Au-delà de 500 000 € : 1,19 % (1,7 % fourni, moins 30 %)
  if (prime === undefined && cout >= 500_000) {
    prime = Math.round(cout * TAUX_AU_DELA_500K)
    const tauxAffiche = (TAUX_AU_DELA_500K * 100).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    tranche = `> 500 k€ (${tauxAffiche} %)`
  }

  if (prime === undefined || tranche === undefined) return null

  // Remise web 5 % sur la part DO
  const remiseWeb = Math.round(prime * REMISE_WEB_DO)
  prime -= remiseWeb

  let supplementTrc = 0
  let supplementRcmo = 0
  if (avecTrc) {
    supplementTrc = Math.round(cout * TAUX_TRC)
    prime += supplementTrc
  }
  if (avecRcmo) {
    supplementRcmo = Math.round(cout * TAUX_RCMO)
    prime += supplementRcmo
  }

  return {
    primeAnnuelle: prime,
    tranche,
    isEstimation: true,
    ...(remiseWeb > 0 && { remiseWeb }),
    ...(supplementTrc > 0 && { supplementTrc }),
    ...(supplementRcmo > 0 && { supplementRcmo }),
  }
}
