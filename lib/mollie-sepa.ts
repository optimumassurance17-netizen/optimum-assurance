/**
 * Prélèvements SEPA trimestriels via Mollie : Customer, mandat IBAN, paiements récurrents
 * et reconduction automatique annuelle (tous les 3 mois).
 * @see https://docs.mollie.com/docs/recurring-payments
 */

import type { MollieClient } from "@mollie/api-client"
import { MandateMethod, MandateStatus, PaymentMethod, SequenceType } from "@mollie/api-client"
import { prisma } from "@/lib/prisma"
import { isValidIban, normalizeIban } from "@/lib/iban"

export { normalizeIban } from "@/lib/iban"

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime())
  out.setMonth(out.getMonth() + months)
  return out
}

/**
 * Après paiement CB du 1er trimestre : crée le client Mollie, le mandat SEPA et l’enregistrement SepaSubscription.
 */
export async function setupSepaSubscriptionAfterT1Card(
  mollie: MollieClient,
  params: {
    userId: string
    email: string
    raisonSociale: string
    iban: string
    titulaireCompte: string
    primeAnnuelle: number
    baseUrl: string
  }
): Promise<{ ok: boolean; error?: string }> {
  const existing = await prisma.sepaSubscription.findUnique({
    where: { userId: params.userId },
  })
  if (existing) {
    return { ok: true }
  }

  const iban = normalizeIban(params.iban)
  if (!isValidIban(iban)) {
    return { ok: false, error: "IBAN invalide (clé ou format incorrect)" }
  }

  try {
    const customer = await mollie.customers.create({
      name: params.titulaireCompte || params.raisonSociale,
      email: params.email,
      metadata: { userId: params.userId },
    })

    const mandate = await mollie.customerMandates.create({
      customerId: customer.id,
      method: MandateMethod.directdebit,
      consumerAccount: iban,
      consumerName: params.titulaireCompte || params.raisonSociale,
      signatureDate: new Date().toISOString().slice(0, 10),
    })

    const mandateOk = mandate.status === MandateStatus.valid
    const now = new Date()
    const nextSepaDue = addMonths(now, 3)

    await prisma.sepaSubscription.create({
      data: {
        userId: params.userId,
        mollieCustomerId: customer.id,
        mollieMandateId: mandate.id,
        primeAnnuelle: params.primeAnnuelle,
        trimestresSepaPayes: 0,
        firstTrimesterPaidAt: now,
        nextSepaDue,
        status: mandateOk ? "active" : "pending_mandate",
        lastError: mandateOk ? null : `Mandat ${mandate.status}`,
      },
    })

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[mollie-sepa] setupSepaSubscriptionAfterT1Card:", e)
    return { ok: false, error: msg }
  }
}

/**
 * Crée un prélèvement SEPA récurrent (échéance trimestrielle).
 */
export async function createSepaTrimestrePayment(
  mollie: MollieClient,
  params: {
    customerId: string
    mandateId: string
    amount: number
    description: string
    webhookUrl: string
    redirectUrl: string
    metadata: Record<string, string>
    idempotencyKey?: string
  }
) {
  return mollie.customerPayments.create({
    customerId: params.customerId,
    amount: { currency: "EUR", value: params.amount.toFixed(2) },
    description: params.description,
    webhookUrl: params.webhookUrl,
    redirectUrl: params.redirectUrl,
    method: PaymentMethod.directdebit,
    sequenceType: SequenceType.recurring,
    mandateId: params.mandateId,
    metadata: params.metadata,
    ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {}),
  })
}

export async function refreshMandateStatus(
  mollie: MollieClient,
  customerId: string,
  mandateId: string
): Promise<"valid" | "pending" | "invalid"> {
  const mandate = await mollie.customerMandates.get(mandateId, { customerId })
  return mandate.status as "valid" | "pending" | "invalid"
}

/**
 * Webhook : prélèvement trimestriel SEPA réussi.
 */
export async function onSepaTrimestrePaid(subscriptionId: string): Promise<void> {
  const sub = await prisma.sepaSubscription.findUnique({
    where: { id: subscriptionId },
  })
  if (!sub) return
  if (sub.status === "cancelled") return

  const next = sub.trimestresSepaPayes + 1
  const nextDueBase = sub.nextSepaDue ?? sub.firstTrimesterPaidAt ?? new Date()
  await prisma.sepaSubscription.update({
    where: { id: subscriptionId },
    data: {
      trimestresSepaPayes: next,
      nextSepaDue: addMonths(nextDueBase, 3),
      status: "active",
      lastError: null,
      sepaPendingPaymentId: null,
    },
  })
}

export async function onSepaTrimestreFailed(subscriptionId: string, reason: string): Promise<void> {
  await prisma.sepaSubscription.updateMany({
    where: { id: subscriptionId },
    data: {
      lastError: reason.slice(0, 2000),
      sepaPendingPaymentId: null,
    },
  })
}
