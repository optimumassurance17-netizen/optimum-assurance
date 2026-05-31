"use client"

import { useCallback, useEffect, useState } from "react"
import { LINKABLE_ASSETS, LINKPILOT_CAMPAIGN_STATUSES, LINKPILOT_CATEGORIES } from "@/lib/linkpilot/constants"
import { StatusBadge } from "@/components/admin/seo/StatusBadge"

type Campaign = {
  id: string
  name: string
  target_category: string | null
  email_subject: string | null
  email_body: string | null
  status: string
  created_at: string
}

type Prospect = { id: string; category: string }

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Erreur ${response.status}`)
  }
  return (await response.json()) as T
}

export function CampaignsTable() {
  const [items, setItems] = useState<Campaign[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [targetPage, setTargetPage] = useState<(typeof LINKABLE_ASSETS)[number]>(LINKABLE_ASSETS[0])
  const [form, setForm] = useState({
    name: "",
    target_category: "autre",
    email_subject: "",
    email_body: "",
    status: "draft",
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [campaignsRes, prospectsRes] = await Promise.all([
        fetchJson<{ items: Campaign[] }>("/api/admin/seo/linkpilot/campaigns"),
        fetchJson<{ items: Prospect[] }>("/api/admin/seo/linkpilot/prospects"),
      ])
      setItems(campaignsRes.items ?? [])
      setProspects(prospectsRes.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement campagnes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await fetchJson("/api/admin/seo/linkpilot/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setCreating(false)
      setForm({
        name: "",
        target_category: "autre",
        email_subject: "",
        email_body: "",
        status: "draft",
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création campagne impossible")
    }
  }

  async function updateStatus(campaign: Campaign, status: string) {
    try {
      await fetchJson(`/api/admin/seo/linkpilot/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour statut impossible")
    }
  }

  async function generateAiTemplate(campaign: Campaign) {
    try {
      const response = await fetchJson<{ subject: string; body: string }>(
        "/api/admin/seo/linkpilot/generate-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "partenaire-btp.fr",
            url: "https://partenaire-btp.fr",
            category: campaign.target_category ?? "autre",
            niche: campaign.target_category ?? "construction",
            targetPage,
          }),
        }
      )
      await fetchJson(`/api/admin/seo/linkpilot/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_subject: response.subject, email_body: response.body }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Génération IA impossible")
    }
  }

  async function deleteCampaign(campaign: Campaign) {
    const confirmed = window.confirm(`Supprimer la campagne "${campaign.name}" ?`)
    if (!confirmed) return
    try {
      await fetchJson(`/api/admin/seo/linkpilot/campaigns/${campaign.id}`, { method: "DELETE" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible")
    }
  }

  function prospectsCountByCategory(category: string | null) {
    if (!category) return prospects.length
    return prospects.filter((prospect) => prospect.category === category).length
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Page cible modèle IA
            </label>
            <select
              value={targetPage}
              onChange={(event) => setTargetPage(event.target.value as (typeof LINKABLE_ASSETS)[number])}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {LINKABLE_ASSETS.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setCreating((value) => !value)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {creating ? "Fermer" : "Créer campagne"}
          </button>
          <button
            onClick={() => void load()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {creating ? (
        <form onSubmit={createCampaign} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Nouvelle campagne</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              required
              placeholder="Nom campagne"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={form.target_category}
              onChange={(event) => setForm((prev) => ({ ...prev, target_category: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {LINKPILOT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              placeholder="Email subject (optionnel)"
              value={form.email_subject}
              onChange={(event) => setForm((prev) => ({ ...prev, email_subject: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {LINKPILOT_CAMPAIGN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Corps email (optionnel)"
              value={form.email_body}
              onChange={(event) => setForm((prev) => ({ ...prev, email_body: event.target.value }))}
              className="min-h-[110px] rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
          </div>
          <button className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Enregistrer campagne
          </button>
        </form>
      ) : null}

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Chargement campagnes…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Aucune campagne créée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-3 py-2">Campagne</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">Prospects associés</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Email modèle</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{campaign.name}</p>
                      <p className="text-xs text-slate-500">{new Date(campaign.created_at).toLocaleString("fr-FR")}</p>
                    </td>
                    <td className="px-3 py-2">{campaign.target_category ?? "toutes"}</td>
                    <td className="px-3 py-2">{prospectsCountByCategory(campaign.target_category)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      <p>{campaign.email_subject ?? "Non généré"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <select
                          value={campaign.status}
                          onChange={(event) => void updateStatus(campaign, event.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          {LINKPILOT_CAMPAIGN_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => void generateAiTemplate(campaign)}
                          className="rounded-lg border border-indigo-300 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                          Générer modèle IA
                        </button>
                        <button
                          onClick={() => void deleteCampaign(campaign)}
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
