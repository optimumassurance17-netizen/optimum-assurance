import { primeTrimestrielle } from "@/lib/premium"

export type ClientEcheanceKind = "decennale" | "avenant" | "attestation"

export type ClientEcheance = {
  id: string
  kind: ClientEcheanceKind
  label: string
  amount: number
  dueDate: string | null
  paid: boolean
  paidAt: string | null
  installmentNumber: number | null
  sepaSubscriptionId: string | null
  avenantFeeId: string | null
  attestationId: string | null
  cardLinkStatus: "none" | "open"
  checkoutUrl: string | null
}

export type ClientEcheanceSource = {
  primeAnnuelle: number | null
  anchorDate: Date | null
  firstTrimesterPaidAt: Date | null
  trimestresSepaPayes: number
  sepaSubscriptionId: string | null
  explicitPaidInstallments: { installment: number; paidAt: Date | null }[]
  avenantFees: { id: string; amount: number; status: string; paidAt: Date | null; createdAt: Date }[]
  suspendedAttestations: { id: string; numero: string; amount: number; createdAt: Date }[]
}

function addMonths(date: Date, months: number): Date {
  const out = new Date(date.getTime())
  out.setMonth(out.getMonth() + months)
  return out
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function installmentFromPaymentMetadata(metadata: string | null | undefined): number | null {
  if (!metadata?.trim()) return null
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>
    if (parsed.type === "decennale_premier_trimestre") return 1
    const raw = parsed.installmentNumber ?? parsed.sepaInstallmentNumber
    const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN
    if (Number.isInteger(value) && value >= 1 && value <= 40) return value
    if (typeof parsed.echeanceId === "string") {
      const match = /^decennale:(\d+)$/.exec(parsed.echeanceId)
      if (match) {
        const fromId = Number(match[1])
        if (fromId >= 1 && fromId <= 40) return fromId
      }
    }
  } catch {
    return null
  }
  return null
}

export function buildClientEcheances(source: ClientEcheanceSource): ClientEcheance[] {
  const rows: ClientEcheance[] = []
  const prime = source.primeAnnuelle
  if (prime != null && prime > 0) {
    const amount = primeTrimestrielle(prime)
    const paidNumbers = new Set<number>()
    const paidAtByNumber = new Map<number, Date>()
    if (source.firstTrimesterPaidAt) {
      paidNumbers.add(1)
      paidAtByNumber.set(1, source.firstTrimesterPaidAt)
    }
    const sepaPaid = Math.max(0, Math.floor(source.trimestresSepaPayes))
    for (let index = 1; index <= sepaPaid; index += 1) {
      paidNumbers.add(index + 1)
    }
    for (const entry of source.explicitPaidInstallments) {
      if (entry.installment < 1 || entry.installment > 40) continue
      paidNumbers.add(entry.installment)
      if (entry.paidAt) paidAtByNumber.set(entry.installment, entry.paidAt)
    }
    const maxPaid = paidNumbers.size > 0 ? Math.max(...paidNumbers) : 0
    const count = Math.max(4, maxPaid >= 4 ? maxPaid + 1 : 4)
    const anchor = source.anchorDate ?? source.firstTrimesterPaidAt
    for (let installment = 1; installment <= count; installment += 1) {
      const paid = paidNumbers.has(installment)
      const paidAt = paidAtByNumber.get(installment) ?? null
      rows.push({
        id: `decennale:${installment}`,
        kind: "decennale",
        label: `Échéance ${installment}`,
        amount,
        dueDate: anchor ? addMonths(anchor, (installment - 1) * 3).toISOString() : null,
        paid,
        paidAt: paidAt ? paidAt.toISOString() : null,
        installmentNumber: installment,
        sepaSubscriptionId: source.sepaSubscriptionId,
        avenantFeeId: null,
        attestationId: null,
        cardLinkStatus: "none",
        checkoutUrl: null,
      })
    }
  }

  for (const fee of source.avenantFees) {
    const paid = fee.status === "paid"
    rows.push({
      id: `avenant:${fee.id}`,
      kind: "avenant",
      label: "Frais d'avenant",
      amount: roundMoney(fee.amount),
      dueDate: fee.createdAt.toISOString(),
      paid,
      paidAt: paid && fee.paidAt ? fee.paidAt.toISOString() : null,
      installmentNumber: null,
      sepaSubscriptionId: null,
      avenantFeeId: fee.id,
      attestationId: null,
      cardLinkStatus: "none",
      checkoutUrl: null,
    })
  }

  for (const attestation of source.suspendedAttestations) {
    if (!(attestation.amount > 0)) continue
    rows.push({
      id: `attestation:${attestation.id}`,
      kind: "attestation",
      label: `Régularisation ${attestation.numero}`,
      amount: roundMoney(attestation.amount),
      dueDate: attestation.createdAt.toISOString(),
      paid: false,
      paidAt: null,
      installmentNumber: null,
      sepaSubscriptionId: null,
      avenantFeeId: null,
      attestationId: attestation.id,
      cardLinkStatus: "none",
      checkoutUrl: null,
    })
  }

  return rows
}

export function findClientEcheance(rows: ClientEcheance[], echeanceId: string): ClientEcheance | null {
  return rows.find((row) => row.id === echeanceId) ?? null
}

export type PendingCardPayment = {
  status: string
  metadata: string | null
  molliePaymentId: string
  createdAt: Date
}

export function molliePaymentIsOpen(status: string): boolean {
  return status === "open" || status === "pending" || status === "authorized"
}

export function mollieCardLinkIsClosed(status: string): boolean {
  return status === "expired" || status === "canceled" || status === "cancelled" || status === "failed"
}

export function readEcheanceCardLink(metadata: string | null | undefined): {
  echeanceId: string
  checkoutUrl: string | null
} | null {
  if (!metadata?.trim()) return null
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>
    if (parsed.type !== "echeance_carte") return null
    if (typeof parsed.echeanceId !== "string" || !parsed.echeanceId.trim()) return null
    const checkoutUrl =
      typeof parsed.checkoutUrl === "string" && parsed.checkoutUrl.startsWith("https://")
        ? parsed.checkoutUrl
        : null
    return { echeanceId: parsed.echeanceId, checkoutUrl }
  } catch {
    return null
  }
}

export function stringRecordFromMetadata(metadata: string | null | undefined): Record<string, string> {
  if (!metadata?.trim()) return {}
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[key] = value
      else if (typeof value === "number" || typeof value === "boolean") out[key] = String(value)
    }
    return out
  } catch {
    return {}
  }
}

/** Le lien le plus récent encore en attente est affiché. Une échéance déjà réglée n'en montre pas. */
export function attachOpenCardLinks(rows: ClientEcheance[], payments: PendingCardPayment[]): ClientEcheance[] {
  const latest = new Map<string, { checkoutUrl: string | null; createdAt: number }>()
  for (const payment of payments) {
    if (payment.status !== "pending") continue
    if (!payment.molliePaymentId || payment.molliePaymentId.startsWith("manuel_")) continue
    const link = readEcheanceCardLink(payment.metadata)
    if (!link) continue
    const createdAt = payment.createdAt.getTime()
    const previous = latest.get(link.echeanceId)
    if (!previous || createdAt >= previous.createdAt) {
      latest.set(link.echeanceId, { checkoutUrl: link.checkoutUrl, createdAt })
    }
  }

  return rows.map((row) => {
    if (row.paid) return { ...row, cardLinkStatus: "none", checkoutUrl: null }
    const link = latest.get(row.id)
    if (!link) return { ...row, cardLinkStatus: "none", checkoutUrl: null }
    return { ...row, cardLinkStatus: "open", checkoutUrl: link.checkoutUrl }
  })
}

export function echeanceReceiptLabel(metadata: Record<string, unknown>): string {
  const label = metadata.label
  if (typeof label === "string" && label.trim()) return label.trim()
  if (metadata.type === "sepa_trimestre") {
    const installment = metadata.sepaInstallmentNumber
    if (typeof installment === "string" && installment.trim()) return `Prélèvement SEPA n°${installment.trim()}`
    if (typeof installment === "number" && Number.isFinite(installment)) return `Prélèvement SEPA n°${installment}`
    return "Prélèvement SEPA"
  }
  const id = typeof metadata.echeanceId === "string" ? metadata.echeanceId : ""
  const decennale = /^decennale:(\d+)$/.exec(id)
  if (decennale) return `Échéance ${decennale[1]}`
  if (id.startsWith("avenant:")) return "Frais d'avenant"
  if (id.startsWith("attestation:")) return "Régularisation"
  return "Échéance"
}
