import { createMollieClient, type MollieClient } from "@mollie/api-client"
import { applyEcheancePaidEffects } from "@/lib/client-echeance-service"
import {
  cardPaymentMatches,
  mollieCardLinkIsClosed,
  molliePaymentIsOpen,
  readOpenCardTarget,
  stringRecordFromMetadata,
} from "@/lib/client-echeances"
import { sendEcheancePaidReceipt } from "@/lib/echeance-receipt"
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
    let remote
    try {
      remote = await params.mollie.payments.get(pending.molliePaymentId)
    } catch (error) {
      console.error("[open-card-link] lecture du lien carte", error)
      return {
        kind: "blocked",
        message: "Impossible de vérifier le lien carte déjà envoyé. Aucun second lien n'a été créé.",
      }
    }

    const metadata = stringRecordFromMetadata(pending.metadata)
    if (remote.status === "paid") {
      const claimed = await prisma.payment.updateMany({
        where: { id: pending.id, status: "pending" },
        data: { status: "paid", paidAt: new Date() },
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

    if (molliePaymentIsOpen(remote.status)) {
      const checkoutUrl = remote._links?.checkout?.href || readOpenCardTarget(pending.metadata)?.checkoutUrl || ""
      if (!checkoutUrl) {
        return {
          kind: "blocked",
          message: "Le lien carte est encore ouvert, mais Mollie n'a pas renvoyé son adresse.",
        }
      }
      if (remote._links?.checkout?.href && remote._links.checkout.href !== metadata.checkoutUrl) {
        await prisma.payment.update({
          where: { id: pending.id },
          data: { metadata: JSON.stringify({ ...metadata, checkoutUrl: remote._links.checkout.href }) },
        })
      }
      return { kind: "open", checkoutUrl, paymentId: pending.molliePaymentId }
    }

    if (mollieCardLinkIsClosed(remote.status)) {
      await prisma.payment.updateMany({
        where: { id: pending.id, status: "pending" },
        data: { status: "failed" },
      })
      continue
    }

    return {
      kind: "blocked",
      message: "Le lien carte est dans un état inattendu. Aucun second lien n'a été créé.",
    }
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
