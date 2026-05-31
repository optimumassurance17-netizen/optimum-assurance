"use client"

import { useCallback, useEffect, useState } from "react"

type ToxicDomain = {
  id: string
  domain: string
  reason: string | null
  spam_score: number
  created_at: string
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Erreur ${response.status}`)
  }
  return (await response.json()) as T
}

export function ToxicLinksTable() {
  const [items, setItems] = useState<ToxicDomain[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ domain: "", reason: "", spam_score: 70 })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchJson<{ items: ToxicDomain[] }>("/api/admin/seo/linkpilot/toxic-links")
      setItems(response.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement domaines toxiques")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await fetchJson("/api/admin/seo/linkpilot/toxic-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setForm({ domain: "", reason: "", spam_score: 70 })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ajout impossible")
    }
  }

  async function removeDomain(domain: ToxicDomain) {
    const confirmed = window.confirm(`Supprimer ${domain.domain} de la liste toxique ?`)
    if (!confirmed) return
    try {
      await fetchJson(`/api/admin/seo/linkpilot/toxic-links/${domain.id}`, { method: "DELETE" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible")
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addDomain} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Bloquer un domaine toxique</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            required
            placeholder="domain.tld"
            value={form.domain}
            onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Raison"
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={form.spam_score}
            onChange={(event) => setForm((prev) => ({ ...prev, spam_score: Number(event.target.value) || 0 }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button className="mt-3 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
          Bloquer domaine
        </button>
      </form>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Chargement domaines toxiques…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Aucun domaine toxique enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-3 py-2">Domaine</th>
                  <th className="px-3 py-2">Raison</th>
                  <th className="px-3 py-2">Spam score</th>
                  <th className="px-3 py-2">Ajouté le</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-900">{item.domain}</td>
                    <td className="px-3 py-2 text-slate-700">{item.reason ?? "—"}</td>
                    <td className="px-3 py-2">{item.spam_score}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{new Date(item.created_at).toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => void removeDomain(item)}
                        className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
