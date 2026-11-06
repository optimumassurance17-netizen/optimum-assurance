/** Reprise du passé décennale : au plus 3 mois avant le jour de l'autorisation. */

export const REPRISE_PASSE_MAX_MONTHS = 3

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function calendarDateInParis(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function addCalendarMonths(isoDate: string, months: number): string | null {
  const match = ISO_DATE.exec(isoDate)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const targetMonthIndex = month - 1 + months
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(day, lastDay)
  return new Date(Date.UTC(targetYear, targetMonth, targetDay)).toISOString().slice(0, 10)
}

export function isoToFrenchDate(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate)
  if (!match) return isoDate
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function frenchOrIsoToIso(value: string): string | null {
  const trimmed = value.trim()
  if (ISO_DATE.test(trimmed)) return trimmed
  const french = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (!french) return null
  const iso = `${french[3]}-${french[2]}-${french[1]}`
  return ISO_DATE.test(iso) ? iso : null
}

export function reprisePasseWindow(now = new Date()): { earliest: string; latest: string } {
  const latest = calendarDateInParis(now)
  const earliest = addCalendarMonths(latest, -REPRISE_PASSE_MAX_MONTHS)
  if (!earliest) throw new Error("date de reprise illisible")
  return { earliest, latest }
}

export function validateReprisePasseDate(
  value: string,
  now = new Date()
): { ok: true; dateReprise: string } | { ok: false; error: string } {
  const dateReprise = value.trim()
  if (!ISO_DATE.test(dateReprise)) {
    return { ok: false, error: "Indiquez la date de reprise au format AAAA-MM-JJ." }
  }
  const { earliest, latest } = reprisePasseWindow(now)
  if (dateReprise > latest) {
    return { ok: false, error: "La date de reprise ne peut pas être dans le futur." }
  }
  if (dateReprise < earliest) {
    return {
      ok: false,
      error: `La reprise du passé est limitée à 3 mois. La date la plus ancienne est le ${isoToFrenchDate(earliest)}.`,
    }
  }
  return { ok: true, dateReprise }
}

export const REPRISE_PASSE_CLIENT_TITRE =
  "Modification de votre assurance décennale : reprise du passé"

export const REPRISE_PASSE_CLIENT_ETAPES = [
  "La date de début de votre assurance est reculée. Cette nouvelle date s'appelle la date de reprise du passé. Elle est inscrite sur votre attestation d'assurance et ne peut pas remonter de plus de 3 mois.",
  "Cette modification n'est possible que si vous n'avez déclaré aucun sinistre. Vous le confirmez par une attestation sur l'honneur de non-sinistralité, conservée dans votre espace client. Une déclaration inexacte peut remettre en cause la garantie.",
  "Transmettez uniquement l'attestation d'assurance modifiée. C'est elle qui indique la date de reprise. L'attestation sur l'honneur reste dans votre dossier et ne remplace pas l'attestation d'assurance.",
] as const

export function reprisePasseClientText(dateReprise: string, numero: string): string {
  return [
    `Votre assurance décennale a été modifiée. La reprise du passé est autorisée au ${dateReprise}.`,
    ...REPRISE_PASSE_CLIENT_ETAPES,
    `Votre attestation ${numero} porte cette date de reprise.`,
  ].join("\n\n")
}

export function documentShowsReprisePasse(type: string, data: Record<string, unknown>): boolean {
  if (type === "attestation" || type === "contrat") return data.reprisePasse === true
  if (type === "attestation_non_sinistralite") return data.motif === "reprise_passe"
  return false
}

export function reprisePasseDateLabel(data: Record<string, unknown>): string {
  const iso = typeof data.dateReprisePasse === "string" ? data.dateReprisePasse.trim() : ""
  if (ISO_DATE.test(iso)) return isoToFrenchDate(iso)
  const debut = typeof data.dateDebut === "string" ? data.dateDebut.trim() : ""
  if (ISO_DATE.test(debut)) return isoToFrenchDate(debut)
  const effet = typeof data.dateEffet === "string" ? data.dateEffet.trim() : ""
  return ISO_DATE.test(effet) ? isoToFrenchDate(effet) : effet
}

export function repriseInstant(isoDate: string): Date {
  const match = ISO_DATE.exec(isoDate)
  if (!match) throw new Error("date de reprise illisible")
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0))
}
