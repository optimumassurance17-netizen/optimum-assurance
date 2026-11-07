import { DO_LOTS_CLOS_COUVERT, DO_LOTS_EXCLUS_CLOS_COUVERT } from "@/lib/nomenclature-activites"

const LOTS_CLOS = DO_LOTS_CLOS_COUVERT.map((item) => item.lot)
const LOTS_SECOND_OEUVRE = [...DO_LOTS_EXCLUS_CLOS_COUVERT]
const LOTS_CONNUS = [...LOTS_CLOS, ...LOTS_SECOND_OEUVRE]
const CLOS = new Set<string>(LOTS_CLOS)
const CONNUS = new Map(LOTS_CONNUS.map((lot) => [lot.toLocaleLowerCase("fr-FR"), lot]))

export const DO_LOTS_TOUS_LIBELLE = "Tous les lots de l'opération"

export function lotsConnus(): string[] {
  return [...LOTS_CONNUS]
}

export function lotsParDefaut(closEtCouvert: boolean): string[] {
  return closEtCouvert ? [...LOTS_CLOS] : [...LOTS_CONNUS]
}

export function estLotClosEtCouvert(lot: string): boolean {
  return CLOS.has(lot)
}

export function normaliserLotsCouverts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== "string") continue
    const name = CONNUS.get(item.trim().toLocaleLowerCase("fr-FR"))
    if (!name || out.includes(name)) continue
    out.push(name)
  }
  return out
}

/** Une sélection limitée aux lots de structure est une formule clos et couvert. */
export function estClosEtCouvert(lots: readonly string[]): boolean {
  return lots.length > 0 && lots.every((lot) => CLOS.has(lot))
}

export function lotsEffectifs(data: {
  lotsCouverts?: unknown
  operationClosCouvert?: boolean | null
}): string[] {
  const choisis = normaliserLotsCouverts(data.lotsCouverts)
  if (choisis.length > 0) return choisis
  if (data.operationClosCouvert == null) return []
  return lotsParDefaut(data.operationClosCouvert)
}

export function libelleLotsCouverts(lots: readonly string[]): string {
  const tous = lotsParDefaut(false)
  if (lots.length === tous.length && tous.every((lot) => lots.includes(lot))) return DO_LOTS_TOUS_LIBELLE
  return lots.join(", ")
}

export function lotsDepuisLibelle(value: string): string[] {
  const text = value.trim()
  if (text.toLocaleLowerCase("fr-FR") === DO_LOTS_TOUS_LIBELLE.toLocaleLowerCase("fr-FR")) {
    return lotsParDefaut(false)
  }
  return normaliserLotsCouverts(text.split(","))
}

function lignesTexte(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((line): line is string => typeof line === "string")
}

export function lotsCouvertsDuDocument(data: {
  lotsCouverts?: unknown
  caracteristiques?: unknown
  operationLines?: unknown
  activities?: unknown
}): string[] {
  const direct = normaliserLotsCouverts(data.lotsCouverts)
  if (direct.length > 0) return direct
  const lines = [
    ...lignesTexte(data.caracteristiques),
    ...lignesTexte(data.operationLines),
    ...lignesTexte(data.activities),
  ]
  const line = lines.find((item) => item.trim().toLocaleLowerCase("fr-FR").startsWith("lots couverts"))
  if (!line) return []
  return lotsDepuisLibelle(line.split(":").slice(1).join(":"))
}

export type ResumeLotsCouverts = {
  couverts: string[]
  exclus: string[]
  closEtCouvert: boolean
}

export function resumeLotsDocument(data: {
  lotsCouverts?: unknown
  caracteristiques?: unknown
  operationLines?: unknown
  activities?: unknown
  closCouvert?: boolean
  operationClosCouvert?: boolean
}): ResumeLotsCouverts | null {
  const couverts = lotsCouvertsDuDocument(data)
  if (couverts.length > 0) {
    const choisi = new Set(couverts)
    return {
      couverts,
      exclus: LOTS_CONNUS.filter((lot) => !choisi.has(lot)),
      closEtCouvert: estClosEtCouvert(couverts),
    }
  }
  if (data.closCouvert === true || data.operationClosCouvert === true) {
    return {
      couverts: lotsParDefaut(true),
      exclus: [...LOTS_SECOND_OEUVRE],
      closEtCouvert: true,
    }
  }
  return null
}

/** Une ligne « Clos et couvert : Non » ne limite pas la garantie. */
export function texteIndiqueClosCouvert(line: string): boolean {
  if (/lots couverts/i.test(line)) return false
  if (!/clos et couvert/i.test(line)) return false
  return !/\bnon\b/i.test(line)
}
