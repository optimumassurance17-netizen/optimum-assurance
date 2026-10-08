import { Locale, PaymentMethod, type MollieClient } from "@mollie/api-client"
import { mollieCardLinkIsClosed, molliePaymentIsOpen } from "@/lib/client-echeances"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"
import { prisma } from "@/lib/prisma"

export type CreatedCardLink =
  | { kind: "ready"; checkoutUrl: string; paymentId: string }
  | { kind: "blocked"; message: string }

export type RemotePaymentLock =
  | { kind: "card-open"; checkoutUrl: string }
  | { kind: "debit-open" }
  | { kind: "paid" }
  | { kind: "closed" }
  | { kind: "blocked"; message: string }

function remoteRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {}
  return metadata as Record<string, unknown>
}

/** Crée un paiement carte et l'enregistre en attente. À appeler seulement si aucun lien n'est ouvert. */
export async function createStoredCardPayment(params: {
  mollie: MollieClient
  userId: string
  amount: number
  description: string
  redirectPath: string
  metadata: Record<string, string>
}): Promise<CreatedCardLink> {
  const baseUrl = getMolliePublicBaseUrl()
  const payment = await params.mollie.payments.create({
    amount: { currency: "EUR", value: params.amount.toFixed(2) },
    description: params.description,
    redirectUrl: `${baseUrl}${params.redirectPath}`,
    webhookUrl: `${baseUrl}/api/mollie/webhook`,
    method: PaymentMethod.creditcard,
    locale: Locale.fr_FR,
    metadata: params.metadata,
  })
  const checkoutUrl = payment._links?.checkout?.href
  if (!checkoutUrl) {
    return { kind: "blocked", message: "Mollie n'a pas renvoyé de lien de paiement." }
  }
  try {
    await prisma.payment.create({
      data: {
        userId: params.userId,
        molliePaymentId: payment.id,
        amount: params.amount,
        status: "pending",
        metadata: JSON.stringify({ ...params.metadata, checkoutUrl }),
      },
    })
  } catch (error) {
    console.error("[gestion-card-link] enregistrement du lien", error)
  }
  return { kind: "ready", checkoutUrl, paymentId: payment.id }
}

/**
 * Lit un paiement déjà accroché à l'abonnement SEPA.
 * Un prélèvement encore ouvert bloque un nouveau lien carte.
 */
export async function readRemotePaymentLock(mollie: MollieClient, paymentId: string): Promise<RemotePaymentLock> {
  let remote
  try {
    remote = await mollie.payments.get(paymentId)
  } catch (error) {
    console.error("[gestion-card-link] lecture du paiement SEPA", error)
    return {
      kind: "blocked",
      message: "Impossible de vérifier le paiement déjà lancé. Aucun lien carte n'a été créé.",
    }
  }

  if (remote.status === "paid") return { kind: "paid" }
  if (mollieCardLinkIsClosed(remote.status)) return { kind: "closed" }
  if (!molliePaymentIsOpen(remote.status)) {
    return {
      kind: "blocked",
      message: "Le paiement en cours est dans un état inattendu. Aucun lien carte n'a été créé.",
    }
  }

  const metadata = remoteRecord(remote.metadata)
  const isCard =
    String(remote.method || "") === "creditcard" ||
    metadata.paiementCarteRelance === "true" ||
    metadata.type === "echeance_carte" ||
    metadata.type === "regularisation"
  if (!isCard) return { kind: "debit-open" }

  const checkoutUrl = remote._links?.checkout?.href || ""
  if (!checkoutUrl.startsWith("https://")) {
    return {
      kind: "blocked",
      message: "Le lien carte est encore ouvert, mais Mollie n'a pas renvoyé son adresse.",
    }
  }
  return { kind: "card-open", checkoutUrl }
}

/** Enregistre localement un lien carte Mollie déjà ouvert, pour l'afficher sur la fiche. */
export async function rememberOpenCardPayment(params: {
  userId: string
  molliePaymentId: string
  amount: number
  metadata: Record<string, string>
  checkoutUrl: string
}): Promise<void> {
  const metadata = JSON.stringify({ ...params.metadata, checkoutUrl: params.checkoutUrl })
  const existing = await prisma.payment.findUnique({
    where: { molliePaymentId: params.molliePaymentId },
    select: { id: true, status: true },
  })
  if (!existing) {
    await prisma.payment.create({
      data: {
        userId: params.userId,
        molliePaymentId: params.molliePaymentId,
        amount: params.amount,
        status: "pending",
        metadata,
      },
    })
    return
  }
  if (existing.status !== "pending") return
  await prisma.payment.update({
    where: { id: existing.id },
    data: { metadata },
  })
}
