type CurrentDecennaleContract = {
  numero: string
  createdAt: Date
}

type DecennalePaidPayment = {
  metadata: string | null
  createdAt: Date
}

type DecennaleSepaSubscription = {
  status: string
  createdAt: Date
  firstTrimesterPaidAt?: Date | null
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // ignore malformed metadata
  }
  return {}
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isDecennaleFirstPaymentMetadata(metadata: Record<string, unknown>): boolean {
  return (
    metadata.premierPaiementCarte === true ||
    metadata.premierPaiementCarte === "true" ||
    metadata.type === "decennale_premier_trimestre"
  )
}

function readPaymentContractNumero(metadata: Record<string, unknown>): string | null {
  return (
    asTrimmedString(metadata.contractNumero) ??
    asTrimmedString(metadata.signedContractNumero) ??
    asTrimmedString(metadata.contractNumber) ??
    asTrimmedString(metadata.documentNumero)
  )
}

export function hasCurrentDecennaleFirstPayment(
  payments: DecennalePaidPayment[],
  contract: CurrentDecennaleContract
): boolean {
  return payments.some((payment) => {
    const metadata = parseJsonObject(payment.metadata)
    if (!isDecennaleFirstPaymentMetadata(metadata)) return false

    const paymentContractNumero = readPaymentContractNumero(metadata)
    if (paymentContractNumero) {
      return paymentContractNumero === contract.numero
    }

    return payment.createdAt.getTime() >= contract.createdAt.getTime()
  })
}

export function isSepaSubscriptionForCurrentDecennale(
  subscription: DecennaleSepaSubscription | null,
  contract: CurrentDecennaleContract
): boolean {
  if (!subscription || subscription.status === "cancelled") return false

  const referenceDate = subscription.firstTrimesterPaidAt ?? subscription.createdAt
  return referenceDate.getTime() >= contract.createdAt.getTime()
}
