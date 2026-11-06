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

export function repriseInstant(isoDate: string): Date {
  const match = ISO_DATE.exec(isoDate)
  if (!match) throw new Error("date de reprise illisible")
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0))
}
