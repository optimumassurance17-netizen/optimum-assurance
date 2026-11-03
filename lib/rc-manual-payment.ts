import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"

/** Référence stable d'un encaissement RC saisi en gestion, distincte d'un paiement Mollie. */
export function manualRcPaymentReference(contractId: string, sequence: number): string {
  const step = Number.isFinite(sequence) && sequence > 0 ? Math.round(sequence) : 1
  return `manual-rc-${contractId}-${step}`
}

export type ManualRcPaymentKind = "first" | "next" | "retry"

export function resolveManualRcPaymentStep(input: {
  contractId: string
  status: string
  paidAt: Date | string | null
  paidPaymentIds: string[]
  hasCertificate: boolean
}): { ok: true; reference: string; kind: ManualRcPaymentKind } | { ok: false; error: "NOT_PAYABLE" } {
  const paid = Boolean(input.paidAt)
  if (input.status === CONTRACT_STATUS.approved && !paid) {
    return { ok: true, reference: manualRcPaymentReference(input.contractId, 1), kind: "first" }
  }
  if (input.status === CONTRACT_STATUS.active && paid) {
    const latest = input.paidPaymentIds.find((id) => id.trim())
    if (!input.hasCertificate && latest) {
      return { ok: true, reference: latest, kind: "retry" }
    }
    return {
      ok: true,
      reference: manualRcPaymentReference(input.contractId, input.paidPaymentIds.length + 1),
      kind: "next",
    }
  }
  return { ok: false, error: "NOT_PAYABLE" }
}

export function rcManualPaymentAction(contract: {
  productType: string
  status: string
  paidAt: string | null
  hasCertificate?: boolean
}): ManualRcPaymentKind | null {
  if (contract.productType !== "rc_fabriquant") return null
  const step = resolveManualRcPaymentStep({
    contractId: "preview",
    status: contract.status,
    paidAt: contract.paidAt,
    paidPaymentIds: contract.paidAt ? ["preview"] : [],
    hasCertificate: contract.hasCertificate !== false,
  })
  return step.ok ? step.kind : null
}
