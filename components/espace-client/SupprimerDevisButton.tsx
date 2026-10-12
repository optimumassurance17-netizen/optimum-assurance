"use client"

import { useState } from "react"

type Props = {
  idleLabel?: string
  ariaLabel: string
  confirmAriaLabel: string
  cancelAriaLabel: string
  busy: boolean
  locked?: boolean
  error: string | null
  onConfirm: () => void
  onCancel?: () => void
}

export function SupprimerDevisButton({
  idleLabel = "Supprimer",
  ariaLabel,
  confirmAriaLabel,
  cancelAriaLabel,
  busy,
  locked = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={locked}
        onClick={() => setArmed(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {idleLabel}
      </button>
    )
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-2">
      <p className="text-sm font-medium text-[#0a0a0a]">Supprimer ce devis ?</p>
      {error ? (
        <p role="alert" className="max-w-xs text-xs text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-label={confirmAriaLabel}
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {busy ? "Suppression..." : "Confirmer"}
        </button>
        <button
          type="button"
          aria-label={cancelAriaLabel}
          disabled={busy}
          onClick={() => {
            setArmed(false)
            onCancel?.()
          }}
          className="inline-flex items-center justify-center rounded-xl border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-semibold text-[#171717] hover:border-[#2563eb] disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
