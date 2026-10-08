"use client"

import { useEffect, useState } from "react"
import { readResponseJson } from "@/lib/read-response-json"

type ClientEcheanceRow = {
  id: string
  label: string
  amount: number
  dueDate: string | null
  paid: boolean
  cardLinkStatus: "none" | "open" | "expired"
  cardLinkSentAt: string | null
  statusLabel: "Réglé" | "Lien envoyé" | "Lien expiré" | "À venir" | "À régler"
}

function statusClass(label: ClientEcheanceRow["statusLabel"]): string {
  if (label === "Réglé") return "bg-emerald-100 text-emerald-800"
  if (label === "Lien envoyé") return "bg-blue-100 text-blue-900"
  if (label === "Lien expiré") return "bg-amber-100 text-amber-900"
  if (label === "À régler") return "bg-orange-100 text-orange-900"
  return "bg-gray-100 text-gray-700"
}

export function ProchaineEcheanceCard() {
  const [echeances, setEcheances] = useState<ClientEcheanceRow[]>([])
  const [ready, setReady] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch("/api/client/prochaine-echeance")
    if (!res.ok) return
    const body = await readResponseJson<{ echeances?: ClientEcheanceRow[] }>(res)
    setEcheances(body.echeances ?? [])
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/client/prochaine-echeance")
        if (!res.ok || cancelled) return
        const body = await readResponseJson<{ echeances?: ClientEcheanceRow[] }>(res)
        if (!cancelled) setEcheances(body.echeances ?? [])
      } catch {
        if (!cancelled) setEcheances([])
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready || echeances.length === 0) return null

  const pay = async (echeanceId: string) => {
    setBusyId(echeanceId)
    setMessage(null)
    try {
      const res = await fetch("/api/client/prochaine-echeance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ echeanceId }),
      })
      const body = await readResponseJson<{ error?: string; checkoutUrl?: string; alreadyPaid?: boolean }>(res)
      if (body.alreadyPaid) {
        setMessage("Cette échéance est déjà payée.")
        await load()
        setBusyId(null)
        return
      }
      if (!res.ok || !body.checkoutUrl) {
        throw new Error(body.error || "Le lien de paiement n'est pas disponible.")
      }
      window.location.href = body.checkoutUrl
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le lien de paiement n'est pas disponible.")
      setBusyId(null)
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
      <p className="mb-4 font-medium text-blue-950">Échéances</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-blue-200 text-left text-blue-950">
              <th className="py-2 pr-3 font-medium">Échéance</th>
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Montant</th>
              <th className="py-2 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {echeances.map((echeance) => (
              <tr key={echeance.id} className="border-b border-blue-100">
                <td className="py-3 pr-3 text-[#0a0a0a]">{echeance.label}</td>
                <td className="py-3 pr-3 text-blue-900">
                  {echeance.dueDate ? new Date(echeance.dueDate).toLocaleDateString("fr-FR") : "Date à confirmer"}
                </td>
                <td className="py-3 pr-3 text-[#0a0a0a]">{echeance.amount.toLocaleString("fr-FR")} €</td>
                <td className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-1 text-xs ${statusClass(echeance.statusLabel)}`}>
                      {echeance.statusLabel}
                    </span>
                    {echeance.cardLinkStatus === "open" ? (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void pay(echeance.id)}
                        className="rounded-xl bg-[#2563eb] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                      >
                        {busyId === echeance.id ? "Ouverture…" : "Payer avec le lien déjà envoyé"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
    </div>
  )
}
