import {
  primeEcheanceDecennale,
  type PeriodiciteCotisationDecennale,
} from "@/lib/premium"

export type FactureDecennaleVue = {
  primeAnnuelle: number
  periodicite: PeriodiciteCotisationDecennale
  montantEcheance: number
  fraisGestion: number
  montantTotalPaye: number
  libelleEcheance: string
  libelleSuite: string
  libelleSousTitre: string
}

export type FactureDoVue = {
  prime: number
  fraisGestion: number
  fraisCourtage: number
  total: number
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(roundMoney(left) - roundMoney(right)) <= 0.05
}

function inferPeriodicite(
  explicit: string | null | undefined,
  primeAnnuelle: number,
  fraisGestion: number,
  montantPaye: number
): PeriodiciteCotisationDecennale {
  const prime = roundMoney(primeAnnuelle)
  const frais = roundMoney(Math.max(0, fraisGestion))
  const paye = roundMoney(Math.max(0, montantPaye))
  const net = roundMoney(Math.max(0, paye - frais))

  if (explicit === "mensuel" || explicit === "trimestriel") {
    if (prime <= 0 || paye <= 0) return explicit
    const same = primeEcheanceDecennale(prime, explicit)
    if (closeEnough(same + frais, paye) || closeEnough(same, net)) return explicit
    const other: PeriodiciteCotisationDecennale = explicit === "mensuel" ? "trimestriel" : "mensuel"
    const otherAmount = primeEcheanceDecennale(prime, other)
    if (closeEnough(otherAmount + frais, paye) || closeEnough(otherAmount, net)) return other
    return explicit
  }

  if (prime <= 0 || net <= 0) return "mensuel"
  const mois = primeEcheanceDecennale(prime, "mensuel")
  const trimestre = primeEcheanceDecennale(prime, "trimestriel")
  const ecartMois = Math.abs(net - mois)
  const ecartTrimestre = Math.abs(net - trimestre)
  if (ecartTrimestre + 0.001 < ecartMois && ecartTrimestre <= 1) return "trimestriel"
  return "mensuel"
}

function libelles(periodicite: PeriodiciteCotisationDecennale): Pick<
  FactureDecennaleVue,
  "libelleEcheance" | "libelleSuite" | "libelleSousTitre"
> {
  if (periodicite === "trimestriel") {
    return {
      libelleEcheance: "Assurance décennale — 1er trimestre (carte bancaire)",
      libelleSuite: "Échéances suivantes : prélèvement SEPA trimestriel",
      libelleSousTitre: "1er trimestre et frais de gestion",
    }
  }
  return {
    libelleEcheance: "Assurance décennale — 1er mois (carte bancaire)",
    libelleSuite: "Échéances suivantes : prélèvement SEPA mensuel",
    libelleSousTitre: "1er mois et frais de gestion",
  }
}

/** Les lignes de la facture acquittée décennale additionnent le montant encaissé. */
export function factureDecennaleLignes(input: {
  primeAnnuelle: number
  fraisGestion: number
  montantPaye: number
  periodicite?: string | null
}): FactureDecennaleVue {
  const primeAnnuelle = roundMoney(Math.max(0, input.primeAnnuelle))
  const fraisDemande = roundMoney(Math.max(0, input.fraisGestion))
  const montantPaye = roundMoney(Math.max(0, input.montantPaye))
  const periodicite = inferPeriodicite(input.periodicite, primeAnnuelle, fraisDemande, montantPaye)
  const fraisGestion = fraisDemande > montantPaye && montantPaye > 0 ? montantPaye : fraisDemande
  const theorique = primeAnnuelle > 0 ? primeEcheanceDecennale(primeAnnuelle, periodicite) : 0
  let montantEcheance = theorique
  const total = montantPaye > 0 ? montantPaye : roundMoney(theorique + fraisGestion)
  if (!closeEnough(montantEcheance + fraisGestion, total)) {
    montantEcheance = roundMoney(Math.max(0, total - fraisGestion))
  }
  return {
    primeAnnuelle,
    periodicite,
    montantEcheance,
    fraisGestion,
    montantTotalPaye: total,
    ...libelles(periodicite),
  }
}

/** Relit une facture déjà enregistrée. Si les lignes ne font pas le total payé, le total encaissé l'emporte. */
export function presenterFactureDecennale(data: {
  primeAnnuelle?: number
  fraisGestion?: number
  montantPremierTrimestre?: number
  montantEcheance?: number
  montantTotalPaye?: number
  periodicite?: string | null
}): FactureDecennaleVue {
  const fraisGestion = roundMoney(Math.max(0, data.fraisGestion ?? 0))
  const storedEcheance = roundMoney(data.montantEcheance ?? data.montantPremierTrimestre ?? 0)
  const storedTotal = roundMoney(data.montantTotalPaye ?? storedEcheance + fraisGestion)
  const storedSums = storedTotal > 0 && closeEnough(storedEcheance + fraisGestion, storedTotal)
  if (!storedSums) {
    return factureDecennaleLignes({
      primeAnnuelle: data.primeAnnuelle ?? 0,
      fraisGestion,
      montantPaye: storedTotal,
      periodicite: data.periodicite,
    })
  }
  const periodicite = inferPeriodicite(
    data.periodicite,
    data.primeAnnuelle ?? 0,
    fraisGestion,
    storedTotal
  )
  return {
    primeAnnuelle: roundMoney(Math.max(0, data.primeAnnuelle ?? 0)),
    periodicite,
    montantEcheance: storedEcheance,
    fraisGestion,
    montantTotalPaye: storedTotal,
    ...libelles(periodicite),
  }
}

/** Prime, frais de gestion et frais de courtage. Le total est le virement reçu. */
export function factureDoLignes(input: {
  primeAnnuelle: number
  fraisGestion?: number
  fraisCourtage?: number
  montantPaye?: number
}): FactureDoVue {
  const prime = roundMoney(Math.max(0, input.primeAnnuelle))
  const fraisGestion = roundMoney(Math.max(0, input.fraisGestion ?? 0))
  const fraisCourtage = roundMoney(Math.max(0, input.fraisCourtage ?? 0))
  const somme = roundMoney(prime + fraisGestion + fraisCourtage)
  const paye = input.montantPaye == null ? somme : roundMoney(Math.max(0, input.montantPaye))
  if (paye > 0 && !closeEnough(paye, somme)) {
    return { prime: paye, fraisGestion: 0, fraisCourtage: 0, total: paye }
  }
  return { prime, fraisGestion, fraisCourtage, total: somme > 0 ? somme : paye }
}
