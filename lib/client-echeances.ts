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
    })
  }

  return rows
}

export function findClientEcheance(rows: ClientEcheance[], echeanceId: string): ClientEcheance | null {
  return rows.find((row) => row.id === echeanceId) ?? null
}
