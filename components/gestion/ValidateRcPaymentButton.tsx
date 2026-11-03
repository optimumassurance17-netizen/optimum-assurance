"use client"

import { useState } from "react"
import { readResponseJson } from "@/lib/read-response-json"
import type { ManualRcPaymentKind } from "@/lib/rc-manual-payment"

type Props = {
  contractId: string
  contractNumber: string
  premium: number
  action: ManualRcPaymentKind
  onResult: (result: { message: string; type: "success" | "warning" | "error" }) => void
}

function buttonLabel(action: ManualRcPaymentKind): string {
  if (action === "next") return "Échéance suivante reçue"
  if (action === "retry") return "Générer l'attestation"
  return "Virement reçu"
}

export function ValidateRcPaymentButton({
  contractId,
  contractNumber,
  premium,
  action,
  onResult,
}: Props) {
  const [busy, setBusy] = useState(false)
  const amountLabel = premium.toLocaleString("fr-FR")

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        let virementReference = ""
        if (action === "retry") {
          const confirmed = window.confirm(
            `Générer l'attestation RC fabriquant du contrat ${contractNumber} ?`
          )
          if (!confirmed) return
        } else {
          const entered = window.prompt(
            action === "next"
              ? `Libellé ou date du virement de l'échéance suivante (${amountLabel} €) pour ${contractNumber}. L'attestation RC fabriquant sera mise à jour. Ne validez pas un virement déjà encaissé par Mollie.`
              : `Libellé ou date du virement reçu (${amountLabel} €) pour ${contractNumber}. L'attestation RC fabriquant sera générée. Aucun paiement Mollie ne sera créé.`,
            ""
          )
          if (entered == null) return
          virementReference = entered.trim()
          if (!virementReference) {
            onResult({ message: "Indiquez le libellé ou la date du virement.", type: "error" })
            return
          }
        }

        setBusy(true)
        try {
          const res = await fetch(`/api/gestion/insurance-contracts/${contractId}/validate-rc-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(virementReference ? { virementReference } : {}),
          })
          const body = await readResponseJson<{
            error?: string
            warning?: string
            alreadyPaid?: boolean
            kind?: ManualRcPaymentKind
          }>(res)
          if (!res.ok) throw new Error(body.error || "Erreur validation du virement")
          if (body.warning) {
            onResult({ message: body.warning, type: "warning" })
            return
          }
          const kind = body.kind ?? action
          const message = body.alreadyPaid
            ? "Ce virement RC fabriquant était déjà enregistré."
            : kind === "next"
              ? "Échéance enregistrée. L'attestation RC fabriquant est à jour."
              : kind === "retry"
                ? "Attestation RC fabriquant générée."
                : "Virement enregistré. L'attestation RC fabriquant est disponible."
          onResult({ message, type: "success" })
        } catch (error) {
          onResult({
            message: error instanceof Error ? error.message : "Erreur validation du virement",
            type: "error",
          })
        } finally {
          setBusy(false)
        }
      }}
      className="text-emerald-300 hover:text-emerald-200 text-xs font-medium disabled:opacity-50"
    >
      {busy ? "Validation…" : buttonLabel(action)}
    </button>
  )
}
