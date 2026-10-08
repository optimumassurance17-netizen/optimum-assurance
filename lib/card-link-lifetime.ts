/** Durée de vie d'un lien carte partagé. Un paiement carte Mollie expire en 30 minutes ; le lien, non. */
export const CARD_LINK_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

const LINK_REF_START_RE = /^ref ([a-f0-9]{8})\b/i
const LINK_REF_END_RE = /ref ([a-f0-9]{8})\s*$/i

export function cardLinkExpiresAt(now = new Date()): string {
  return new Date(now.getTime() + CARD_LINK_LIFETIME_MS).toISOString().replace(/\.\d{3}Z$/, "+00:00")
}

export function isPaymentLinkId(id: string | null | undefined): boolean {
  return typeof id === "string" && /^pl_[A-Za-z0-9]+$/.test(id)
}

export function createCardLinkRef(bytes = new Uint8Array(4)): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")
}

/** La référence est en tête : un libellé tronqué par la banque garde de quoi retrouver le lien. */
export function cardLinkDescription(description: string, linkRef: string): string {
  const prefix = `ref ${linkRef} — `
  const base = description.trim().slice(0, Math.max(0, 255 - prefix.length))
  return `${prefix}${base}`
}

export function linkRefFromDescription(description: string | null | undefined): string | null {
  if (!description) return null
  const start = description.match(LINK_REF_START_RE)
  if (start?.[1]) return start[1].toLowerCase()
  const end = description.match(LINK_REF_END_RE)
  return end?.[1]?.toLowerCase() ?? null
}

export function stringMapFromUnknown(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string") out[key] = item
    else if (typeof item === "number" || typeof item === "boolean") out[key] = String(item)
  }
  return out
}

export type PaymentLinkView =
  | { kind: "paid" }
  | { kind: "open"; checkoutUrl: string }
  | { kind: "closed" }
  | { kind: "unknown" }

export function interpretPaymentLink(
  link: {
    archived?: boolean
    paidAt?: string | null
    expiresAt?: string | null
    paymentUrl?: string | null
  },
  now = new Date()
): PaymentLinkView {
  if (link.paidAt) return { kind: "paid" }
  if (link.archived) return { kind: "closed" }
  if (link.expiresAt) {
    const expires = new Date(link.expiresAt)
    if (!Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) return { kind: "closed" }
  }
  const checkoutUrl = link.paymentUrl?.startsWith("https://") ? link.paymentUrl : ""
  if (!checkoutUrl) return { kind: "unknown" }
  return { kind: "open", checkoutUrl }
}

export type PendingChargeLock = "skip" | "mark-paid" | "release"

/**
 * Un lien carte encore ouvert (7 jours) bloque un nouveau prélèvement.
 * Une lecture impossible du lien bloque aussi : on ne lance pas un débit à l'aveugle.
 */
export function decidePendingChargeLock(input: {
  kind: "payment" | "payment-link"
  paymentStatus?: string | null
  linkState?: PaymentLinkView["kind"] | "unreadable"
}): PendingChargeLock {
  if (input.kind === "payment-link") {
    if (input.linkState === "paid") return "mark-paid"
    if (input.linkState === "closed") return "release"
    return "skip"
  }
  const status = input.paymentStatus || ""
  if (status === "open" || status === "pending" || status === "authorized") return "skip"
  if (status === "paid") return "mark-paid"
  if (!status || status === "missing") return "release"
  return "release"
}
