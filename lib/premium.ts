/**
 * Helpers de calcul de cotisation partageables côté serveur et client.
 */
export function primeTrimestrielle(primeAnnuelle: number): number {
  return Math.round((primeAnnuelle / 4) * 100) / 100
}
