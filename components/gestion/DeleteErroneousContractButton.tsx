"use client"

import { useState } from "react"
import { erroneousContractDeleteConfirm } from "@/lib/erroneous-contract-delete"
import { readResponseJson } from "@/lib/read-response-json"

type Props = {
  contractNumber: string
  endpoint: string
  paid?: boolean
  className?: string
  onDeleted: () => void | Promise<void>
  onError: (message: string) => void
}

export function DeleteErroneousContractButton({
  contractNumber,
  endpoint,
  paid = false,
  className,
  onDeleted,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        const confirmed = window.confirm(erroneousContractDeleteConfirm(contractNumber, paid))
        if (!confirmed) return
        setBusy(true)
        try {
          const res = await fetch(endpoint, { method: "DELETE" })
          const body = await readResponseJson<{ error?: string }>(res)
          if (!res.ok) throw new Error(body.error || "Impossible de supprimer le contrat")
          await onDeleted()
        } catch (error) {
          onError(error instanceof Error ? error.message : "Impossible de supprimer le contrat")
        } finally {
          setBusy(false)
        }
      }}
      className={`disabled:opacity-50 ${className ?? "text-red-400 hover:text-red-300 text-xs font-medium"}`}
    >
      {busy ? "Suppression…" : "Supprimer (erreur)"}
    </button>
  )
}
