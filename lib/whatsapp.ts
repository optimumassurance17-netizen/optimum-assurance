const DEFAULT_WHATSAPP_NUMBER = "33600000000"
const DEFAULT_WHATSAPP_MESSAGE = "Bonjour, je souhaite un devis décennale."

function sanitizePhone(input: string): string {
  const digits = input.replace(/\D/g, "")
  return digits.length >= 8 ? digits : DEFAULT_WHATSAPP_NUMBER
}

function sanitizeText(input: string): string {
  const normalized = input.trim()
  if (!normalized) return DEFAULT_WHATSAPP_MESSAGE
  return normalized.slice(0, 800)
}

function sanitizeSource(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")
  return normalized.slice(0, 80) || "site"
}

export function getWhatsAppSupportNumber(): string {
  return sanitizePhone(
    process.env.WHATSAPP_SUPPORT_NUMBER ||
      process.env.NEXT_PUBLIC_WHATSAPP ||
      DEFAULT_WHATSAPP_NUMBER
  )
}

export function getWhatsAppDefaultMessage(): string {
  return sanitizeText(process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE || DEFAULT_WHATSAPP_MESSAGE)
}

export function buildWhatsAppTrackingPath(params: {
  source: string
  reference?: string
  leadType?: string
  leadId?: string
  product?: string
  message?: string
}) {
  const qp = new URLSearchParams()
  qp.set("source", params.source.trim().slice(0, 80))
  qp.set("text", sanitizeText(params.message || getWhatsAppDefaultMessage()))
  if (params.reference?.trim()) qp.set("reference", params.reference.trim().slice(0, 120))
  if (params.leadType?.trim()) qp.set("leadType", params.leadType.trim().slice(0, 40))
  if (params.leadId?.trim()) qp.set("leadId", params.leadId.trim().slice(0, 120))
  if (params.product?.trim()) qp.set("product", params.product.trim().slice(0, 40))
  return `/api/whatsapp?${qp.toString()}`
}

export function buildWhatsAppInternalUrl(params: {
  number?: string
  source: string
  text: string
  reference?: string
  leadType?: string
  leadId?: string
  product?: string
}): string {
  const qp = new URLSearchParams()
  qp.set("source", params.source.trim().slice(0, 80))
  if (params.number?.trim()) qp.set("phone", sanitizePhone(params.number))
  qp.set("text", sanitizeText(params.text))
  if (params.reference?.trim()) qp.set("reference", params.reference.trim().slice(0, 120))
  if (params.leadType?.trim()) qp.set("leadType", params.leadType.trim().slice(0, 40))
  if (params.leadId?.trim()) qp.set("leadId", params.leadId.trim().slice(0, 120))
  if (params.product?.trim()) qp.set("product", params.product.trim().slice(0, 40))
  return `/api/whatsapp?${qp.toString()}`
}

export function buildWhatsAppRedirectPath(params: {
  source: string
  context?: string
  reference?: string
  leadType?: string
  leadId?: string
  product?: string
  text?: string
}): string {
  const message = params.text || params.context || getWhatsAppDefaultMessage()
  return buildWhatsAppInternalUrl({
    source: params.source,
    text: message,
    reference: params.reference,
    leadType: params.leadType,
    leadId: params.leadId,
    product: params.product,
  })
}

export function sanitizeWhatsAppMessage(input: string): string {
  return sanitizeText(input)
}

export function sanitizeWhatsAppTrackingSource(input: string): string {
  return sanitizeSource(input)
}

export function buildWhatsAppExternalUrl(number: string, message: string): string {
  const n = sanitizePhone(number)
  const text = encodeURIComponent(sanitizeText(message))
  return `https://wa.me/${n}?text=${text}`
}

export function buildWhatsAppTrackingActionId(source: string): string {
  return `whatsapp_click_${sanitizeSource(source)}`
}

