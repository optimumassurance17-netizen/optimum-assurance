/**
 * Helpers de calcul de cotisation partageables côté serveur et client.
 * La décennale nouvelle se règle au mois. Les prélèvements déjà ouverts
 * au trimestre restent sur ce rythme.
 */
export type PeriodiciteCotisationDecennale = "mensuel" | "trimestriel"

export function primeTrimestrielle(primeAnnuelle: number): number {
  return Math.round((primeAnnuelle / 4) * 100) / 100
}

export function primeMensuelle(primeAnnuelle: number): number {
  return Math.round((primeAnnuelle / 12) * 100) / 100
}

export function periodiciteDecennale(value: string | null | undefined): PeriodiciteCotisationDecennale {
  return value === "trimestriel" ? "trimestriel" : "mensuel"
}

export function moisEntreEcheancesDecennale(periodicite: PeriodiciteCotisationDecennale): number {
  return periodicite === "trimestriel" ? 3 : 1
}

export function nombreEcheancesAnnuellesDecennale(periodicite: PeriodiciteCotisationDecennale): number {
  return periodicite === "trimestriel" ? 4 : 12
}

export function primeEcheanceDecennale(
  primeAnnuelle: number,
  periodicite: PeriodiciteCotisationDecennale
): number {
  return periodicite === "trimestriel" ? primeTrimestrielle(primeAnnuelle) : primeMensuelle(primeAnnuelle)
}
