/** Règles de suppression d'un devis depuis l'espace client. */

export const BLOCKING_QUOTE_PAYMENT_STATUSES = ["paid", "pending", "open", "authorized"] as const

export const CLIENT_QUOTE_DELETE_ERRORS = {
  payment: "Ce devis a un paiement en cours ou déjà encaissé. Il ne peut plus être supprimé.",
  signature: "Une signature est en cours pour ce devis. Il ne peut plus être supprimé.",
  contract: "Ce devis a déjà donné lieu à un contrat. Il ne peut plus être supprimé.",
  invoice: "Ce devis a déjà été facturé. Il ne peut plus être supprimé.",
  fee: "Ce devis est lié à un règlement. Il ne peut plus être supprimé.",
  notQuote: "Seuls les devis peuvent être supprimés.",
} as const

const BLOCKING_PAYMENT_STATUS_SET = new Set<string>(BLOCKING_QUOTE_PAYMENT_STATUSES)

export function isStoredClientQuoteType(type: string): boolean {
  return type === "devis" || type === "devis_do"
}

/** Vrai pour un devis enregistré en base, pas pour un PDF de contrat généré. */
export function isClientDeletableQuoteDocument(doc: {
  type: string
  href?: string | null
  generated?: boolean | null
}): boolean {
  if (doc.generated) return false
  if (typeof doc.href === "string" && doc.href.trim().length > 0) return false
  return isStoredClientQuoteType(doc.type)
}

/** Fragments JSON exacts, avec et sans espace après les deux-points. */
export function jsonFieldEqualsNeedles(field: string, value: string): [string, string] {
  const encoded = JSON.stringify(value)
  return [`"${field}":${encoded}`, `"${field}": ${encoded}`]
}

function readRecord(value: string | null | undefined): Record<string, unknown> | null {
  if (!value?.trim()) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export function paymentMetadataBlocksQuote(
  metadata: string | null | undefined,
  status: string,
  documentId: string,
  documentNumero: string
): boolean {
  if (!BLOCKING_PAYMENT_STATUS_SET.has(status.trim().toLowerCase())) return false
  const record = readRecord(metadata)
  if (!record) {
    if (!metadata) return false
    return jsonFieldEqualsNeedles("documentId", documentId).some((needle) => metadata.includes(needle))
  }
  const metaDocumentId = typeof record.documentId === "string" ? record.documentId : ""
  if (metaDocumentId && metaDocumentId === documentId) return true
  const metaNumero = typeof record.documentNumero === "string" ? record.documentNumero : ""
  const metaType = typeof record.type === "string" ? record.type : ""
  return Boolean(
    metaNumero &&
      metaNumero === documentNumero &&
      (metaType === "devis" || metaType === "devis_do")
  )
}

export function clientQuoteDeleteRefusal(flags: {
  blockingPayment: boolean
  pendingSignature: boolean
  linkedContract: boolean
  linkedInvoice: boolean
  avenantFee: boolean
}): string | null {
  if (flags.blockingPayment) return CLIENT_QUOTE_DELETE_ERRORS.payment
  if (flags.pendingSignature) return CLIENT_QUOTE_DELETE_ERRORS.signature
  if (flags.linkedContract) return CLIENT_QUOTE_DELETE_ERRORS.contract
  if (flags.linkedInvoice) return CLIENT_QUOTE_DELETE_ERRORS.invoice
  if (flags.avenantFee) return CLIENT_QUOTE_DELETE_ERRORS.fee
  return null
}
