/** Durée de validité de toute proposition (décennale, dommage ouvrage, RC, devis personnalisé, brouillon). */
export const QUOTE_VALIDITY_DAYS = 60

const DAY_MS = 24 * 60 * 60 * 1000

export const QUOTE_VALIDITY_MS = QUOTE_VALIDITY_DAYS * DAY_MS

export const QUOTE_EXPIRED_ERROR =
  "Ce devis a expiré. Une proposition est valable 60 jours à compter de son émission."

export function quoteExpiresAt(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + QUOTE_VALIDITY_MS)
}

/** Date la plus ancienne encore acceptée : une émission plus ancienne est expirée. */
export function quoteStillValidSince(now = new Date()): Date {
  return new Date(now.getTime() - QUOTE_VALIDITY_MS)
}

export function isQuoteExpired(issuedAt: Date | string, now = new Date()): boolean {
  const issued = issuedAt instanceof Date ? issuedAt : new Date(issuedAt)
  if (Number.isNaN(issued.getTime())) return true
  return now.getTime() >= issued.getTime() + QUOTE_VALIDITY_MS
}

/** Affichage gestion : une date absente ne marque pas la proposition comme expirée. */
export function isDisplayedQuoteExpired(
  issuedAt: Date | string | null | undefined,
  now = new Date()
): boolean {
  if (issuedAt == null || issuedAt === "") return false
  return isQuoteExpired(issuedAt, now)
}
