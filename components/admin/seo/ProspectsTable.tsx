"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { LINKABLE_ASSETS, LINKPILOT_CATEGORIES, LINKPILOT_STATUSES } from "@/lib/linkpilot/constants"
import { ScoreBadge } from "@/components/admin/seo/ScoreBadge"
import { StatusBadge } from "@/components/admin/seo/StatusBadge"

type Prospect = {
  id: string
  domain: string
  url: string
  contact_email: string | null
  contact_name: string | null
  category: string
  niche: string | null
  country: string
  domain_authority: number
  estimated_traffic: number
  spam_score: number
  relevance_score: number
  backlink_score: number
  status: string
  notes: string | null
  created_at: string
}

type CreateProspectInput = {
  domain: string
  url: string
  contact_email?: string
  contact_name?: string
  category: (typeof LINKPILOT_CATEGORIES)[number]
  niche?: string
  country: string
  domain_authority: number
  estimated_traffic: number
  spam_score: number
  notes?: string
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Erreur ${response.status}`)
  }
  return (await response.json()) as T
}

export function ProspectsTable() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [items, setItems] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [targetPage, setTargetPage] = useState<(typeof LINKABLE_ASSETS)[number]>(LINKABLE_ASSETS[0])

  const [form, setForm] = useState<CreateProspectInput>({
    domain: "",
    url: "",
    category: "autre",
    country: "France",
    domain_authority: 0,
    estimated_traffic: 0,
    spam_score: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (statusFilter) params.set("status", statusFilter)
      if (categoryFilter) params.set("category", categoryFilter)
      const response = await fetchJson<{ items: Prospect[] }>(`/api/admin/seo/linkpilot/prospects?${params.toString()}`)
      setItems(response.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, categoryFilter])

  useEffect(() => {
    void load()
  }, [load])

  const averageScore = useMemo(() => {
    if (!items.length) return 0
    return Math.round(items.reduce((acc, item) => acc + item.backlink_score, 0) / items.length)
  }, [items])

  async function createProspect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await fetchJson("/api/admin/seo/linkpilot/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setAdding(false)
      setForm({
        domain: "",
        url: "",
        category: "autre",
        country: "France",
        domain_authority: 0,
        estimated_traffic: 0,
        spam_score: 0,
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible")
    }
  }

  async function scoreWithAi(prospect: Prospect) {
    try {
      const analysis = await fetchJson<{
        relevance_score: number
        backlink_score: number
        recommendation: string
        ai_notes: string
      }>("/api/admin/seo/linkpilot/analyze-prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: prospect.domain,
          url: prospect.url,
          category: prospect.category,
          niche: prospect.niche ?? "btp",
          domain_authority: prospect.domain_authority,
          estimated_traffic: prospect.estimated_traffic,
          spam_score: prospect.spam_score,
          country: prospect.country,
        }),
      })

      await fetchJson(`/api/admin/seo/linkpilot/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: analysis.ai_notes,
          status: "qualified",
          domain_authority: prospect.domain_authority,
          estimated_traffic: prospect.estimated_traffic,
          spam_score: prospect.spam_score,
          country: prospect.country,
          category: prospect.category,
          niche: prospect.niche,
        }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring IA impossible")
    }
  }

  async function createDraftEmail(prospect: Prospect) {
    if (!prospect.contact_email) {
      setError(`Le prospect ${prospect.domain} n'a pas d'email de contact.`)
      return
    }
    try {
      const draft = await fetchJson<{ subject: string; body: string }>("/api/admin/seo/linkpilot/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: prospect.domain,
          url: prospect.url,
          category: prospect.category,
          niche: prospect.niche ?? "btp",
          targetPage,
        }),
      })
      await fetchJson("/api/admin/seo/linkpilot/outreach-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_id: prospect.id,
          recipient_email: prospect.contact_email,
          subject: draft.subject,
          body: draft.body,
          status: "draft",
        }),
      })
      await fetchJson(`/api/admin/seo/linkpilot/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "contacted" }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création brouillon impossible")
    }
  }

  async function markContacted(id: string) {
    try {
      await fetchJson(`/api/admin/seo/linkpilot/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_contacted" }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible")
    }
  }

  async function convertToBacklink(prospect: Prospect) {
    const confirmed = window.confirm(`Confirmer la conversion du prospect ${prospect.domain} en backlink acquis ?`)
    if (!confirmed) return
    try {
      await fetchJson(`/api/admin/seo/linkpilot/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_acquired",
          backlink: {
            source_url: prospect.url,
            target_url: targetPage,
            anchor_text: "Optimum Assurance",
            link_type: "dofollow",
          },
        }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion impossible")
    }
  }

  async function removeProspect(prospect: Prospect) {
    const confirmed = window.confirm(`Supprimer définitivement le prospect ${prospect.domain} ?`)
    if (!confirmed) return
    try {
      await fetchJson(`/api/admin/seo/linkpilot/prospects/${prospect.id}`, { method: "DELETE" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible")
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Recherche domaine</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ex: blog-btp.fr"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Tous</option>
              {LINKPILOT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Catégorie</label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Toutes</option>
              {LINKPILOT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Page cible</label>
            <select
              value={targetPage}
              onChange={(event) => setTargetPage(event.target.value as (typeof LINKABLE_ASSETS)[number])}
              className="max-w-[280px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {LINKABLE_ASSETS.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Rechercher
          </button>
          <button
            onClick={() => setAdding((value) => !value)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {adding ? "Fermer" : "Ajouter prospect"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Score moyen actuel : {averageScore}/100</p>
      </div>

      {adding ? (
        <form onSubmit={createProspect} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Nouveau prospect</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input required placeholder="Domain" value={form.domain} onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder="URL" value={form.url} onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Contact email" value={form.contact_email ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Contact name" value={form.contact_name ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as (typeof LINKPILOT_CATEGORIES)[number] }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              {LINKPILOT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input placeholder="Niche" value={form.niche ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, niche: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Country" value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" min={0} max={100} placeholder="DA" value={form.domain_authority} onChange={(e) => setForm((prev) => ({ ...prev, domain_authority: Number(e.target.value) || 0 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" min={0} placeholder="Trafic estimé" value={form.estimated_traffic} onChange={(e) => setForm((prev) => ({ ...prev, estimated_traffic: Number(e.target.value) || 0 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" min={0} max={100} placeholder="Spam score" value={form.spam_score} onChange={(e) => setForm((prev) => ({ ...prev, spam_score: Number(e.target.value) || 0 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Notes" value={form.notes ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2 lg:col-span-2" />
          </div>
          <div className="mt-3">
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Enregistrer prospect
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Chargement prospects…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Aucun prospect trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-3 py-2">Domaine</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">DA</th>
                  <th className="px-3 py-2">Spam</th>
                  <th className="px-3 py-2">Relevance</th>
                  <th className="px-3 py-2">Backlink</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((prospect) => (
                  <tr key={prospect.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{prospect.domain}</p>
                      <a href={prospect.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        {prospect.url}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      <p>{prospect.contact_name ?? "—"}</p>
                      <p>{prospect.contact_email ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">{prospect.category}</td>
                    <td className="px-3 py-2 text-xs">{prospect.domain_authority}</td>
                    <td className="px-3 py-2 text-xs">{prospect.spam_score}</td>
                    <td className="px-3 py-2">
                      <ScoreBadge score={prospect.relevance_score} />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreBadge score={prospect.backlink_score} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={prospect.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => void scoreWithAi(prospect)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          Scorer avec IA
                        </button>
                        <button
                          onClick={() => void createDraftEmail(prospect)}
                          className="rounded-lg border border-indigo-300 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                          Créer brouillon email
                        </button>
                        <button
                          onClick={() => void markContacted(prospect.id)}
                          className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Marquer contacté
                        </button>
                        <button
                          onClick={() => void convertToBacklink(prospect)}
                          className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Convertir en backlink
                        </button>
                        <button
                          onClick={() => void removeProspect(prospect)}
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
