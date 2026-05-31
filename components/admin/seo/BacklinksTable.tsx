"use client"

import { useCallback, useEffect, useState } from "react"
import { LINKABLE_ASSETS, LINKPILOT_BACKLINK_STATUSES, LINKPILOT_BACKLINK_TYPES } from "@/lib/linkpilot/constants"
import { StatusBadge } from "@/components/admin/seo/StatusBadge"

type BacklinkRow = {
  id: string
  source_url: string
  target_url: string
  anchor_text: string | null
  link_type: string
  status: string
  first_seen_at: string | null
  last_checked_at: string | null
}

type CreateBacklinkForm = {
  source_url: string
  target_url: string
  anchor_text: string
  link_type: (typeof LINKPILOT_BACKLINK_TYPES)[number]
  status: (typeof LINKPILOT_BACKLINK_STATUSES)[number]
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Erreur ${response.status}`)
  }
  return (await response.json()) as T
}

export function BacklinksTable() {
  const [items, setItems] = useState<BacklinkRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<CreateBacklinkForm>({
    source_url: "",
    target_url: LINKABLE_ASSETS[0],
    anchor_text: "Optimum Assurance",
    link_type: "dofollow",
    status: "active",
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchJson<{ items: BacklinkRow[] }>("/api/admin/seo/linkpilot/backlinks")
      setItems(response.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement backlinks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createBacklink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await fetchJson("/api/admin/seo/linkpilot/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setAdding(false)
      setForm({
        source_url: "",
        target_url: LINKABLE_ASSETS[0],
        anchor_text: "Optimum Assurance",
        link_type: "dofollow",
        status: "active",
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création backlink impossible")
    }
  }

  async function verifyBacklink(row: BacklinkRow) {
    try {
      await fetchJson(`/api/admin/seo/linkpilot/backlinks/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ touch_checked_at: true }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vérification impossible")
    }
  }

  async function updateStatus(row: BacklinkRow, status: string) {
    try {
      await fetchJson(`/api/admin/seo/linkpilot/backlinks/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible")
    }
  }

  async function deleteBacklink(row: BacklinkRow) {
    const confirmed = window.confirm(`Supprimer le backlink ${row.source_url} ?`)
    if (!confirmed) return
    try {
      await fetchJson(`/api/admin/seo/linkpilot/backlinks/${row.id}`, { method: "DELETE" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible")
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          onClick={() => setAdding((value) => !value)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {adding ? "Fermer" : "Ajouter backlink"}
        </button>
      </div>

      {adding ? (
        <form onSubmit={createBacklink} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Nouveau backlink acquis</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <input
              required
              placeholder="Source URL"
              value={form.source_url}
              onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm lg:col-span-2"
            />
            <select
              value={form.target_url}
              onChange={(event) => setForm((prev) => ({ ...prev, target_url: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {LINKABLE_ASSETS.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </select>
            <input
              value={form.anchor_text}
              onChange={(event) => setForm((prev) => ({ ...prev, anchor_text: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={form.link_type}
              onChange={(event) => setForm((prev) => ({ ...prev, link_type: event.target.value as (typeof LINKPILOT_BACKLINK_TYPES)[number] }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {LINKPILOT_BACKLINK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <button className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Enregistrer backlink
          </button>
        </form>
      ) : null}

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Chargement backlinks…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Aucun backlink acquis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Anchor</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Dernier check</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <a href={row.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {row.source_url}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-xs">{row.target_url}</td>
                    <td className="px-3 py-2 text-xs">{row.anchor_text ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{row.link_type}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {row.last_checked_at ? new Date(row.last_checked_at).toLocaleString("fr-FR") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => void verifyBacklink(row)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          Vérifier manuellement
                        </button>
                        <select
                          value={row.status}
                          onChange={(event) => void updateStatus(row, event.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          {LINKPILOT_BACKLINK_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => void deleteBacklink(row)}
                          className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
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
