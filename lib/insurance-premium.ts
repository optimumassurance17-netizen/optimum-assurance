/**
 * Prime par trimestre pour les produits annualisés payés en 4 échéances.
 */
export function primeTrimestrielle(primeAnnuelle: number): number {
  return Math.round((primeAnnuelle / 4) * 100) / 100
}
