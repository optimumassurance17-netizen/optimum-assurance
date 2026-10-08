import { primeTrimestrielle } from "@/lib/premium"

const CHARGEABLE_STATUSES = new Set(["active", "pending_mandate", "completed"])

export type SepaReadinessSource = {
  status: string
  mollieMandateId: string | null
  nextSepaDue: Date | string | null
  lastError: string | null
  sepaPendingPaymentId: string | null
  trimestresSepaPayes: number
  primeAnnuelle: number
}

export type SepaReadiness = {
  present: boolean
  status: string | null
  mandatePresent: boolean
  nextDue: string | null
  lastError: string | null
  pendingPaymentId: string | null
  trimestresSepaPayes: number
  amount: number | null
  cronWouldCharge: boolean
  summary: string
}

function parseDue(value: Date | string | null): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Lecture seule : aucun appel Mollie, aucun prélèvement. */
export function describeSepaReadiness(
  subscription: SepaReadinessSource | null,
  now: Date = new Date()
): SepaReadiness {
  if (!subscription) {
    return {
      present: false,
      status: null,
      mandatePresent: false,
      nextDue: null,
      lastError: null,
      pendingPaymentId: null,
      trimestresSepaPayes: 0,
      amount: null,
      cronWouldCharge: false,
      summary: "Aucun prélèvement SEPA n'est enregistré sur cette fiche.",
    }
  }

  const nextDue = parseDue(subscription.nextSepaDue)
  const mandatePresent = Boolean(subscription.mollieMandateId?.trim())
  const pendingPaymentId = subscription.sepaPendingPaymentId?.trim() || null
  const due = Boolean(nextDue && nextDue.getTime() <= now.getTime())
  const chargeableStatus = CHARGEABLE_STATUSES.has(subscription.status)
  const cronWouldCharge = chargeableStatus && due && mandatePresent && !pendingPaymentId
  const amount = subscription.primeAnnuelle > 0 ? primeTrimestrielle(subscription.primeAnnuelle) : null

  let summary: string
  if (subscription.status === "cancelled") {
    summary = "Abonnement SEPA annulé : le cron ne lancera pas de prélèvement."
  } else if (!mandatePresent) {
    summary = "Mandat SEPA absent : le cron ne peut pas prélever."
  } else if (pendingPaymentId) {
    summary = "Un prélèvement est déjà en attente chez Mollie : le cron n'en créera pas un second."
  } else if (!chargeableStatus) {
    summary = "Le statut de l'abonnement ne permet pas un prélèvement automatique."
  } else if (!nextDue) {
    summary = "Aucune date de prochaine échéance : le cron ne prélèvera pas."
  } else if (!due) {
    summary = "La prochaine échéance n'est pas encore due : le cron ne prélèvera pas."
  } else {
    summary = "L'échéance est due : le cron de prélèvement SEPA la prendrait au prochain passage."
  }

  return {
    present: true,
    status: subscription.status,
    mandatePresent,
    nextDue: nextDue ? nextDue.toISOString() : null,
    lastError: subscription.lastError?.trim() || null,
    pendingPaymentId,
    trimestresSepaPayes: Math.max(0, Math.floor(subscription.trimestresSepaPayes)),
    amount,
    cronWouldCharge,
    summary,
  }
}
