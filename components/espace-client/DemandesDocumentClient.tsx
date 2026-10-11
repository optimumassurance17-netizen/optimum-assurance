"use client"

import { useEffect, useState } from "react"
import { readResponseJson } from "@/lib/read-response-json"

export type ClientDocumentRequest = {
  id: string
  message: string
  assuranceLabel: string
  createdAt: string
  depositedFilename: string | null
  depositedAt: string | null
}

export function DemandesDocumentClient({
  initialRequests,
}: {
  initialRequests?: ClientDocumentRequest[]
}) {
  const [requests, setRequests] = useState<ClientDocumentRequest[] | null>(initialRequests ?? null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialRequests) return
    let cancelled = false
    void (async () => {
      const res = await fetch("/api/client/demandes-document")
      if (!res.ok) return
      const json = await readResponseJson<{ requests?: ClientDocumentRequest[] }>(res)
      if (!cancelled && Array.isArray(json.requests)) setRequests(json.requests)
    })()
    return () => {
      cancelled = true
    }
  }, [initialRequests])

  if (!requests || requests.length === 0) return null

  return (
    <section id="demandes-document" className="mb-8 rounded-2xl border border-[#fcd34d] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#b45309]">Documents</p>
      <h2 className="mt-1 text-xl font-bold text-[#0a0a0a]">Documents demandés</h2>
      <p className="mt-1 max-w-2xl text-sm text-[#171717]">
        Optimum Assurance vous demande les pièces ci-dessous. Déposez le fichier correspondant. Ce dépôt ne confirme
        pas que le dossier est garanti.
      </p>
      <ul className="mt-4 space-y-4">
        {requests.map((request) => (
          <li key={request.id} className="rounded-xl border border-[#e5e5e5] bg-[#fffbeb] p-4">
            <p className="text-sm font-medium text-[#0a0a0a]">{request.message}</p>
            <p className="mt-1 text-xs text-[#57534e]">
              {request.assuranceLabel}
              {" · "}
              {new Date(request.createdAt).toLocaleString("fr-FR")}
            </p>
            {request.depositedFilename ? (
              <p className="mt-2 text-sm text-[#166534]">
                Pièce déposée : {request.depositedFilename}
                {request.depositedAt ? ` le ${new Date(request.depositedAt).toLocaleString("fr-FR")}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#92400e]">En attente de votre pièce.</p>
            )}
            <form
              className="mt-3 flex flex-wrap items-center gap-3"
              onSubmit={async (event) => {
                event.preventDefault()
                const form = event.currentTarget
                const input = form.elements.namedItem("file")
                const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined
                if (!file) {
                  setError("Choisissez le fichier à déposer.")
                  return
                }
                setSendingId(request.id)
                setError(null)
                try {
                  const body = new FormData()
                  body.set("requestId", request.id)
                  body.set("file", file)
                  const res = await fetch("/api/client/demandes-document", { method: "POST", body })
                  const json = await readResponseJson<{ error?: string; request?: ClientDocumentRequest }>(res)
                  if (!res.ok || !json.request) throw new Error(json.error || "Dépôt impossible.")
                  setRequests((current) =>
                    (current ?? []).map((row) => (row.id === json.request!.id ? json.request! : row))
                  )
                  form.reset()
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Dépôt impossible.")
                } finally {
                  setSendingId(null)
                }
              }}
            >
              <input
                type="file"
                name="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="text-sm text-[#171717]"
              />
              <button
                type="submit"
                disabled={sendingId === request.id}
                className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {sendingId === request.id ? "Dépôt…" : "Déposer la pièce"}
              </button>
            </form>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  )
}
