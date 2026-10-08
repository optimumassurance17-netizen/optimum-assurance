import { createMollieClient, type MollieClient } from "@mollie/api-client"
import { applyEcheancePaidEffects } from "@/lib/client-echeance-service"
import { cardPaymentMatches, stringRecordFromMetadata } from "@/lib/client-echeances"
import { sendEcheancePaidReceipt } from "@/lib/echeance-receipt"
import { readRemoteCardLink } from "@/lib/gestion-card-link"
import { prisma } from "@/lib/prisma"

export type OpenCardLinkResult =
  | { kind: "none" }
  | { kind: "open"; checkoutUrl: string; paymentId: string }
  | { kind: "paid" }
  | { kind: "cleared" }
  | { kind: "blocked"; message: string }

type PendingCardRow = {
  id: string
  molliePaymentId: string
  metadata: string | null
  amount: number
}

async function listMatchingPendingPayments(
  userId: string,
  match: (metadata: string | null) => boolean
): Promise<PendingCardRow[]> {
  const rows = await prisma.payment.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true, molliePaymentId: true, metadata: true, amount: true },
  })
  return rows.filter((row) => {
    if (!row.molliePaymentId || row.molliePaymentId.startsWith("manuel_")) return false
    return match(row.metadata)
  })
}

/** Vérifie un lien carte déjà enregistré. Ne crée jamais de paiement. */
export async function resolveOpenCardLink(params: {
  mollie: MollieClient | null
  userId: string
  match: (metadata: string | null) => boolean
  raisonSociale: string
  /** mark-only : le webhook métier envoie le reçu et active le mandat. */
  onPaid?: "effects" | "mark-only"
}): Promise<OpenCardLinkResult> {
  const pendingRows = await listMatchingPendingPayments(params.userId, params.match)
  if (pendingRows.length === 0) return { kind: "none" }
  if (!params.mollie) {
    return {
      kind: "blocked",
      message: "Un lien carte est déjà enregistré et Mollie n'est pas joignable. Aucun second lien n'a été créé.",
    }
  }

  for (const pending of pendingRows) {
    const metadata = stringRecordFromMetadata(pending.metadata)
    const remote = await readRemoteCardLink(params.mollie, pending.molliePaymentId, metadata.checkoutUrl)
    if (remote.kind === "blocked") return remote
    if (remote.kind === "debit-open") {
      return {
        kind: "blocked",
        message: "Un prélèvement SEPA est déjà en cours. Aucun second lien n'a été créé.",
      }
    }

    if (remote.kind === "paid") {
      if (params.onPaid === "mark-only") return { kind: "paid" }
      const claimed = await prisma.payment.updateMany({
        where: { id: pending.id, status: "pending" },
        data: {
          status: "paid",
          paidAt: new Date(),
          metadata: JSON.stringify({ ...metadata, effectsApplied: "true" }),
        },
      })
      if (claimed.count === 1) {
        await applyEcheancePaidEffects(metadata)
        await sendEcheancePaidReceipt({
          email: metadata.email || "",
          raisonSociale: metadata.raisonSociale || params.raisonSociale,
          metadata,
          amount: pending.amount,
        })
      }
      return { kind: "paid" }
    }

    if (remote.kind === "card-open") {
      if (remote.checkoutUrl !== metadata.checkoutUrl) {
        await prisma.payment.update({
          where: { id: pending.id },
          data: { metadata: JSON.stringify({ ...metadata, checkoutUrl: remote.checkoutUrl }) },
        })
      }
      return { kind: "open", checkoutUrl: remote.checkoutUrl, paymentId: pending.molliePaymentId }
    }

    await prisma.payment.updateMany({
      where: { id: pending.id, status: "pending" },
      data: { status: "failed" },
    })
  }

  return { kind: "cleared" }
}

export function attestationCardMatch(attestationId: string) {
  return (metadata: string | null) => cardPaymentMatches(metadata, { attestationId })
}

export function echeanceCardMatch(echeanceId: string, attestationId?: string | null) {
  return (metadata: string | null) => cardPaymentMatches(metadata, { echeanceId, attestationId })
}

export function createMollieClientFromEnv(): MollieClient | null {
  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) return null
  return createMollieClient({ apiKey })
}
