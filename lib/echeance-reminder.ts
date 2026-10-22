/** Relance automatique envoyée 10 jours avant l'échéance, avec un rattrapage jusqu'à J-7. */
export const ECHEANCE_REMINDER_LEAD_DAYS = 10
export const ECHEANCE_REMINDER_CATCHUP_DAYS = 7

const PARIS_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function parisCalendarDay(date: Date): string {
  return PARIS_DAY.format(date)
}

export function addCalendarDays(day: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return day
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

/** Nombre de jours de calendrier à Paris entre aujourd'hui et l'échéance. Négatif si elle est passée. */
export function calendarDaysUntil(due: Date, now: Date): number | null {
  if (Number.isNaN(due.getTime()) || Number.isNaN(now.getTime())) return null
  const today = parisCalendarDay(now)
  const dueDay = parisCalendarDay(due)
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today)
  const dueMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDay)
  if (!todayMatch || !dueMatch) return null
  const start = Date.UTC(Number(todayMatch[1]), Number(todayMatch[2]) - 1, Number(todayMatch[3]))
  const end = Date.UTC(Number(dueMatch[1]), Number(dueMatch[2]) - 1, Number(dueMatch[3]))
  return Math.round((end - start) / 86_400_000)
}

export function echeanceReminderIsDue(due: Date, now = new Date()): boolean {
  const days = calendarDaysUntil(due, now)
  if (days == null) return false
  return days <= ECHEANCE_REMINDER_LEAD_DAYS && days >= ECHEANCE_REMINDER_CATCHUP_DAYS
}

/** Fenêtre SQL un peu plus large que les jours de Paris, pour ne pas rater minuit. */
export function echeanceReminderQueryRange(now = new Date()): { start: Date; end: Date } {
  const today = parisCalendarDay(now)
  const startDay = addCalendarDays(today, ECHEANCE_REMINDER_CATCHUP_DAYS - 1)
  const endDay = addCalendarDays(today, ECHEANCE_REMINDER_LEAD_DAYS + 2)
  return {
    start: new Date(`${startDay}T00:00:00.000Z`),
    end: new Date(`${endDay}T00:00:00.000Z`),
  }
}

export function factureEcheanceNumero(subscriptionId: string, due: Date): string {
  const day = parisCalendarDay(due).replace(/-/g, "")
  const suffix = subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "echeance"
  return `FAC-ECH-${day}-${suffix}`
}

export function echeanceReminderTargetId(subscriptionId: string, due: Date): string {
  return `${subscriptionId}:${parisCalendarDay(due)}`
}

export function formatEcheanceDay(due: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(due)
}
