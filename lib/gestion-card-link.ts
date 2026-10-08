import { randomBytes } from "crypto"
import { PaymentMethod, type MollieClient } from "@mollie/api-client"
import {
  cardLinkDescription,
  cardLinkExpiresAt,
  createCardLinkRef,
  decidePendingChargeLock,
  interpretPaymentLink,
  isPaymentLinkId,
  linkRefFromDescription,
  stringMapFromUnknown,
  type PendingChargeLock,
} from "@/lib/card-link-lifetime"
import { mollieCardLinkIsClosed, molliePaymentIsOpen, stringRecordFromMetadata } from "@/lib/client-echeances"
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

const CARD_LINK_LOOKUP_MS = 10 * 24 * 60 * 60 * 1000

function remoteRecord(metadata: unknown): Record<string, unknown> {
  return stringMapFromUnknown(metadata)
}

function resolveRedirect(redirectTo: string): string {
  if (redirectTo.startsWith("https://") || redirectTo.startsWith("http://")) return redirectTo
  const path = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`
  return `${getMolliePublicBaseUrl()}${path}`
}

function paymentLinkUrl(link: { getPaymentUrl?: () => string }): string {
  try {
    const url = link.getPaymentUrl?.() || ""
    return url.startsWith("https://") ? url : ""
  } catch {
    return ""
  }
}

async function linkHasPaidPayment(link: {
  getPayments: () => { find: (callback: (payment: { status: string }) => boolean) => Promise<{ status: string } | undefined> }
}): Promise<boolean> {
  const paid = await link.getPayments().find((payment) => payment.status === "paid")
  return Boolean(paid)
}

/** Crée un lien carte valable 7 jours et l'enregistre en attente. À appeler seulement si aucun lien n'est ouvert. */
export async function createStoredCardPayment(params: {
  mollie: MollieClient
  userId: string
  amount: number
  description: string
  redirectTo: string
  metadata: Record<string, string>
}): Promise<CreatedCardLink> {
  const linkRef = createCardLinkRef(randomBytes(4))
  const description = cardLinkDescription(params.description, linkRef)
  const expiresAt = cardLinkExpiresAt()
  let link
  try {
    link = await params.mollie.paymentLinks.create({
      amount: { currency: "EUR", value: params.amount.toFixed(2) },
      description,
      redirectUrl: resolveRedirect(params.redirectTo),
      webhookUrl: `${getMolliePublicBaseUrl()}/api/mollie/webhook`,
      expiresAt,
      allowedMethods: [PaymentMethod.creditcard],
      reusable: false,
    })
  } catch (error) {
    console.error("[gestion-card-link] création du lien carte", error)
    return { kind: "blocked", message: "Mollie n'a pas pu créer le lien de paiement." }
  }

  const checkoutUrl = paymentLinkUrl(link)
  if (!checkoutUrl) {
    return { kind: "blocked", message: "Mollie n'a pas renvoyé de lien de paiement." }
  }

  const metadata = {
    ...params.metadata,
    checkoutUrl,
    linkRef,
    mollieDescription: description,
    cardLinkExpiresAt: expiresAt,
    paymentLinkId: link.id,
  }
  try {
    await prisma.payment.create({
      data: {
        userId: params.userId,
        molliePaymentId: link.id,
        amount: params.amount,
        status: "pending",
        metadata: JSON.stringify(metadata),
      },
    })
  } catch (error) {
    console.error("[gestion-card-link] enregistrement du lien", error)
    try {
      await params.mollie.paymentLinks.update(link.id, { archived: true })
    } catch (archiveError) {
      console.error("[gestion-card-link] archivage du lien non enregistré", archiveError)
    }
    return {
      kind: "blocked",
      message: "Le lien de paiement n'a pas pu être enregistré. Aucun lien n'a été envoyé.",
    }
  }
  return { kind: "ready", checkoutUrl, paymentId: link.id }
}

/** Lit un paiement `tr_` ou un lien `pl_` sans confondre un prélèvement et un lien carte. */
export async function readRemoteCardLink(
  mollie: MollieClient,
  mollieId: string,
  storedCheckoutUrl?: string | null
): Promise<RemotePaymentLock> {
  if (isPaymentLinkId(mollieId)) {
    try {
      const link = await mollie.paymentLinks.get(mollieId)
      if (link.paidAt) return { kind: "paid" }
      try {
        if (await linkHasPaidPayment(link)) return { kind: "paid" }
      } catch (error) {
        console.warn("[gestion-card-link] paiements du lien carte", mollieId, error)
      }
      const view = interpretPaymentLink({
        archived: link.archived,
        paidAt: link.paidAt,
        expiresAt: link.expiresAt,
        paymentUrl: paymentLinkUrl(link) || storedCheckoutUrl || null,
      })
      if (view.kind === "paid") return { kind: "paid" }
      if (view.kind === "closed") return { kind: "closed" }
      if (view.kind === "open") return { kind: "card-open", checkoutUrl: view.checkoutUrl }
      return {
        kind: "blocked",
        message: "Le lien carte est encore ouvert, mais Mollie n'a pas renvoyé son adresse.",
      }
    } catch (error) {
      console.error("[gestion-card-link] lecture du lien carte", error)
      return {
        kind: "blocked",
        message: "Impossible de vérifier le lien carte déjà envoyé. Aucun second lien n'a été créé.",
      }
    }
  }

  let remote
  try {
    remote = await mollie.payments.get(mollieId)
  } catch (error) {
    console.error("[gestion-card-link] lecture du paiement", error)
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
    metadata.type === "regularisation" ||
    metadata.type === "decennale_premier_trimestre"
  if (!isCard) return { kind: "debit-open" }

  const checkoutUrl = remote._links?.checkout?.href || (storedCheckoutUrl?.startsWith("https://") ? storedCheckoutUrl : "")
  if (!checkoutUrl.startsWith("https://")) {
    return {
      kind: "blocked",
      message: "Le lien carte est encore ouvert, mais Mollie n'a pas renvoyé son adresse.",
    }
  }
  return { kind: "card-open", checkoutUrl }
}

export async function readRemotePaymentLock(mollie: MollieClient, paymentId: string): Promise<RemotePaymentLock> {
  return readRemoteCardLink(mollie, paymentId)
}

/** Ferme un lien ou un paiement encore ouvert. */
export async function retireRemoteCardLink(mollie: MollieClient, mollieId: string): Promise<void> {
  if (isPaymentLinkId(mollieId)) {
    await mollie.paymentLinks.update(mollieId, { archived: true })
    return
  }
  await mollie.payments.cancel(mollieId)
}

/**
 * Le webhook Mollie porte l'identifiant du paiement carte (`tr_`), pas celui du lien (`pl_`).
 * La référence en tête de description retrouve la fiche enregistrée, avec l'IBAN et l'échéance.
 */
export async function findStoredCardLinkForPayment(
  mollie: MollieClient,
  payment: { id: string; description?: string | null }
): Promise<{ molliePaymentId: string; metadata: Record<string, string> } | null> {
  const linkRef = linkRefFromDescription(payment.description)
  if (!linkRef) return null
  const since = new Date(Date.now() - CARD_LINK_LOOKUP_MS)
  const row = await prisma.payment.findFirst({
    where: {
      molliePaymentId: { startsWith: "pl_" },
      metadata: { contains: `"linkRef":"${linkRef}"` },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: { molliePaymentId: true, metadata: true },
  })
  if (!row?.molliePaymentId) return null

  try {
    const link = await mollie.paymentLinks.get(row.molliePaymentId)
    const match = await link.getPayments().find((item) => item.id === payment.id)
    if (!match) {
      console.warn("[gestion-card-link] paiement pas encore listé sur le lien", row.molliePaymentId, payment.id)
    }
  } catch (error) {
    console.warn("[gestion-card-link] rattachement du paiement au lien", row.molliePaymentId, error)
  }

  return {
    molliePaymentId: row.molliePaymentId,
    metadata: stringRecordFromMetadata(row.metadata),
  }
}

export async function markStoredCardLinkPaid(molliePaymentId: string): Promise<void> {
  const row = await prisma.payment.findUnique({
    where: { molliePaymentId },
    select: { id: true, metadata: true, status: true },
  })
  if (!row || row.status === "paid") return
  const metadata = stringRecordFromMetadata(row.metadata)
  await prisma.payment.update({
    where: { id: row.id },
    data: {
      status: "paid",
      paidAt: new Date(),
      metadata: JSON.stringify({ ...metadata, effectsApplied: "true" }),
    },
  })
}

/** Décide si le cron SEPA doit attendre, encaisser ou relâcher un paiement déjà lancé. */
export async function readPendingChargeLock(mollie: MollieClient, paymentId: string): Promise<PendingChargeLock> {
  if (isPaymentLinkId(paymentId)) {
    const remote = await readRemoteCardLink(mollie, paymentId)
    const linkState =
      remote.kind === "paid"
        ? "paid"
        : remote.kind === "closed"
          ? "closed"
          : remote.kind === "card-open"
            ? "open"
            : "unreadable"
    return decidePendingChargeLock({ kind: "payment-link", linkState })
  }

  try {
    const existing = await mollie.payments.get(paymentId)
    return decidePendingChargeLock({ kind: "payment", paymentStatus: existing.status })
  } catch {
    return decidePendingChargeLock({ kind: "payment", paymentStatus: "missing" })
  }
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
