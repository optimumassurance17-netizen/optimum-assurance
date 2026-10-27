"use client"

import { useState } from "react"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { readResponseJson } from "@/lib/read-response-json"
import { frenchStatusLabel } from "@/lib/status-labels"

export type DoPaymentContract = {
  productType: string
  status: string
  paidAt: string | null
  hasCertificate?: boolean
}

export function canValidateDoPaymentManually(contract: DoPaymentContract): boolean {
  if (contract.productType !== "do") return false
  if (contract.status === CONTRACT_STATUS.approved && !contract.paidAt) return true
  return (
    contract.status === CONTRACT_STATUS.active &&
    Boolean(contract.paidAt) &&
    contract.hasCertificate === false
  )
}

export function doPaymentStatusLabel(contract: DoPaymentContract): string {
  if (contract.productType === "do" && contract.status === CONTRACT_STATUS.approved && !contract.paidAt) {
    return "Approuvé, en attente d'encaissement"
  }
  if (contract.status === CONTRACT_STATUS.pending_validation) return "À approuver"
  if (contract.status === CONTRACT_STATUS.active && contract.paidAt) return "Actif"
  if (contract.status === CONTRACT_STATUS.rejected) return "Refusé"
  if (contract.status === CONTRACT_STATUS.draft) return "Brouillon"
  return frenchStatusLabel(contract.status)
}

type Props = {
  contractId: string
  contractNumber: string
  premium: number
  awaitingPayment: boolean
  onResult: (result: { message: string; type: "success" | "warning" | "error" }) => void
}

export function ValidateDoPaymentButton({
  contractId,
  contractNumber,
  premium,
  awaitingPayment,
  onResult,
}: Props) {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        const amountLabel = premium.toLocaleString("fr-FR")
        const confirmed = window.confirm(
          awaitingPayment
            ? `Confirmer l'encaissement de ${amountLabel} € pour le contrat ${contractNumber} ? L'attestation dommage ouvrage sera délivrée.`
            : `Relancer la délivrance de l'attestation du contrat ${contractNumber} ?`
        )
        if (!confirmed) return
        setBusy(true)
        try {
          const res = await fetch(`/api/gestion/insurance-contracts/${contractId}/validate-do-payment`, {
            method: "POST",
          })
          const body = await readResponseJson<{ error?: string; warning?: string; alreadyPaid?: boolean }>(res)
          if (!res.ok) throw new Error(body.error || "Erreur validation paiement")
          if (body.warning) {
            onResult({ message: body.warning, type: "warning" })
            return
          }
          onResult({
            message: body.alreadyPaid
              ? "Ce paiement dommage ouvrage était déjà enregistré."
              : "Paiement dommage ouvrage validé. L'attestation est disponible.",
            type: "success",
          })
        } catch (error) {
          onResult({
            message: error instanceof Error ? error.message : "Erreur validation paiement",
            type: "error",
          })
        } finally {
          setBusy(false)
        }
      }}
      className="text-emerald-300 hover:text-emerald-200 text-xs font-medium disabled:opacity-50"
    >
      {busy ? "Validation…" : "Valider le paiement"}
    </button>
  )
}
