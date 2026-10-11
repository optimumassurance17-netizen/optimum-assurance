"use client"

import { useState } from "react"
import { readResponseJson } from "@/lib/read-response-json"

type Props = {
  documentId: string
  allowed: boolean
  onDone: (message: string, type: "success" | "error", allowed: boolean) => void
}

export function AutoriserDevisButton({ documentId, allowed, onDone }: Props) {
  const [pending, setPending] = useState(false)

  async function toggle() {
    const next = !allowed
    setPending(true)
    try {
      const res = await fetch(`/api/gestion/documents/${documentId}/edition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowDevisEdition: next }),
      })
      const json = await readResponseJson<{ error?: string }>(res)
      if (!res.ok) throw new Error(json.error || "Erreur lors de l'enregistrement")
      onDone(
        next ? "Modification autorisée pour ce devis." : "Autorisation retirée pour ce devis.",
        "success",
        next
      )
    } catch (error) {
      onDone(error instanceof Error ? error.message : "Erreur lors de l'enregistrement", "error", allowed)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void toggle()}
      className={
        allowed
          ? "rounded-lg border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:border-amber-400 disabled:opacity-50"
          : "rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:border-emerald-400 disabled:opacity-50"
      }
    >
      {pending ? "Enregistrement…" : allowed ? "Retirer l'autorisation" : "Autoriser ce devis"}
    </button>
  )
}
