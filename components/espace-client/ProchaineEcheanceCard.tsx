"use client"

import { useEffect, useState } from "react"
import { readResponseJson } from "@/lib/read-response-json"

type NextEcheance = {
  id: string
  label: string
  amount: number
  dueDate: string | null
  cardLinkStatus: "none" | "open"
  cardLinkSentAt: string | null
}

export function ProchaineEcheanceCard() {
  const [echeance, setEcheance] = useState<NextEcheance | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/client/prochaine-echeance")
        if (!res.ok || cancelled) return
        const body = await readResponseJson<{ echeance?: NextEcheance | null }>(res)
        if (!cancelled) setEcheance(body.echeance ?? null)
      } catch {
        if (!cancelled) setEcheance(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready || !echeance) return null

  const pay = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/client/prochaine-echeance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ echeanceId: echeance.id }),
      })
      const body = await readResponseJson<{ error?: string; checkoutUrl?: string; alreadyPaid?: boolean }>(res)
      if (body.alreadyPaid) {
        setMessage("Cette échéance est déjà payée.")
        setEcheance(null)
        return
      }
      if (!res.ok || !body.checkoutUrl) {
        throw new Error(body.error || "Le lien de paiement n'est pas disponible.")
      }
      window.location.href = body.checkoutUrl
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le lien de paiement n'est pas disponible.")
      setBusy(false)
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
      <p className="mb-1 font-medium text-blue-950">Prochaine échéance</p>
      <p className="text-lg font-semibold text-[#0a0a0a]">{echeance.label}</p>
      <p className="mt-1 text-sm text-blue-900">
        {echeance.dueDate ? new Date(echeance.dueDate).toLocaleDateString("fr-FR") : "Date à confirmer"}
        {" · "}
        {echeance.amount.toLocaleString("fr-FR")} €
      </p>
      {echeance.cardLinkStatus === "open" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void pay()}
            className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {busy ? "Ouverture…" : "Payer avec le lien déjà envoyé"}
          </button>
          {echeance.cardLinkSentAt ? (
            <span className="text-xs text-blue-800">
              Envoyé le {new Date(echeance.cardLinkSentAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-blue-900">Aucun lien de paiement n&apos;a encore été envoyé.</p>
      )}
      {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
    </div>
  )
}
