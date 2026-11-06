import { ACTIVITES_AVEC_TARIFS, ACTIVITES_BTP } from "@/lib/activites-btp"
import { primeTrimestrielle } from "@/lib/premium"
import { calculerTarif } from "@/lib/tarification"

export const AJOUT_ACTIVITE_MAX = 8

export type ChoixActivite = {
  activite: string
  categorie: string
}

export type AjoutActiviteOk = {
  ok: true
  activite: string
  activites: string[]
  primeAnnuelle: number
  nouvellePrimeAnnuelle: number
  regularisation: number
  trimestresDejaPayes: number
  cotisationInchangee: boolean
}

export type AjoutActiviteResult = AjoutActiviteOk | { ok: false; error: string }

function fold(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function activiteCatalogue(name: string): string | null {
  const folded = fold(name)
  if (!folded) return null
  return ACTIVITES_BTP.find((item) => fold(item) === folded) ?? null
}

/** Retient, pour chaque ligne du contrat, l'activité du catalogue la plus précise qu'elle contient. */
export function activitesDejaCouvertes(stored: string[]): string[] {
  const found: string[] = []
  for (const line of stored) {
    const folded = fold(line)
    if (!folded) continue
    const matches = ACTIVITES_BTP.filter((item) => folded.includes(fold(item)))
    const best = matches.sort((left, right) => fold(right).length - fold(left).length)[0]
    if (best && !found.includes(best)) found.push(best)
  }
  return found
}

export function choixActivitesAjoutables(stored: string[]): ChoixActivite[] {
  const covered = new Set(activitesDejaCouvertes(stored))
  if (covered.size >= AJOUT_ACTIVITE_MAX) return []
  return ACTIVITES_AVEC_TARIFS.filter((item) => !covered.has(item.activite)).map((item) => ({
    activite: item.activite,
    categorie: item.categorie,
  }))
}

export function chiffrerAjoutActivite(input: {
  activites: string[]
  activite: string
  chiffreAffaires: number
  primeAnnuelle: number
  sinistres: number
  jamaisAssure: boolean
  resilieNonPaiement: boolean
  reprisePasse: boolean
  trimestresDejaPayes: number
}): AjoutActiviteResult {
  const activite = activiteCatalogue(input.activite)
  if (!activite) {
    return { ok: false, error: "Choisissez une activité dans la liste." }
  }
  const covered = activitesDejaCouvertes(input.activites)
  if (covered.includes(activite)) {
    return { ok: false, error: "Cette activité est déjà assurée." }
  }
  if (covered.length >= AJOUT_ACTIVITE_MAX) {
    return { ok: false, error: "Le contrat comporte déjà 8 activités. Aucune activité supplémentaire ne peut être ajoutée." }
  }
  if (!Number.isFinite(input.chiffreAffaires) || input.chiffreAffaires <= 0) {
    return { ok: false, error: "Le chiffre d'affaires du contrat est nécessaire pour calculer la régularisation." }
  }
  if (!Number.isFinite(input.primeAnnuelle) || input.primeAnnuelle <= 0) {
    return { ok: false, error: "La cotisation actuelle du contrat est introuvable." }
  }

  const flags = {
    chiffreAffaires: input.chiffreAffaires,
    sinistres: Math.max(0, Math.floor(input.sinistres) || 0),
    jamaisAssure: input.jamaisAssure,
    resilieNonPaiement: input.resilieNonPaiement,
    reprisePasse: input.reprisePasse,
  }
  const currentActivities = input.activites.map((item) => item.trim()).filter(Boolean)
  const before = calculerTarif({ ...flags, activites: currentActivities.length ? currentActivities : covered })
  const after = calculerTarif({ ...flags, activites: [...currentActivities, activite] })
  const hausse = Math.max(0, after.primeAnnuelle - before.primeAnnuelle)
  const nouvellePrimeAnnuelle = Math.round((input.primeAnnuelle + hausse) * 100) / 100
  const trimestresDejaPayes = Math.max(0, Math.min(12, Math.floor(input.trimestresDejaPayes) || 0))
  const regularisation =
    Math.round(
      (primeTrimestrielle(nouvellePrimeAnnuelle) - primeTrimestrielle(input.primeAnnuelle)) *
        trimestresDejaPayes *
        100
    ) / 100

  return {
    ok: true,
    activite,
    activites: [...covered, activite],
    primeAnnuelle: input.primeAnnuelle,
    nouvellePrimeAnnuelle,
    regularisation: Math.max(0, regularisation),
    trimestresDejaPayes,
    cotisationInchangee: hausse === 0,
  }
}
