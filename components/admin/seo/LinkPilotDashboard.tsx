"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ScoreBadge } from "@/components/admin/seo/ScoreBadge"
import { StatusBadge } from "@/components/admin/seo/StatusBadge"

type Prospect = {
  id: string
  domain: string
  category: string
  status: string
  backlink_score: number
  created_at: string
}

type Backlink = { id: string }
type Campaign = { id: string; status: string }
type ToxicDomain = { id: string }

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Erreur ${response.status}`)
  }
  return (await response.json()) as T
}

export function LinkPilotDashboard() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [toxicDomains, setToxicDomains] = useState<ToxicDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [prospectsRes, backlinksRes, campaignsRes, toxicRes] = await Promise.all([
          fetchJson<{ items: Prospect[] }>("/api/admin/seo/linkpilot/prospects"),
          fetchJson<{ items: Backlink[] }>("/api/admin/seo/linkpilot/backlinks"),
          fetchJson<{ items: Campaign[] }>("/api/admin/seo/linkpilot/campaigns"),
          fetchJson<{ items: ToxicDomain[] }>("/api/admin/seo/linkpilot/toxic-links"),
        ])
        if (!alive) return
        setProspects(prospectsRes.items ?? [])
        setBacklinks(backlinksRes.items ?? [])
        setCampaigns(campaignsRes.items ?? [])
        setToxicDomains(toxicRes.items ?? [])
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : "Impossible de charger LinkPilot")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "active").length,
    [campaigns]
  )
  const averageSeoScore = useMemo(() => {
    if (prospects.length === 0) return 0
    const total = prospects.reduce((acc, prospect) => acc + (prospect.backlink_score || 0), 0)
    return Math.round(total / prospects.length)
  }, [prospects])

  if (loading) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Chargement LinkPilot AI…</p>
  }
  if (error) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Prospects totaux</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{prospects.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Backlinks obtenus</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{backlinks.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Campagnes actives</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{activeCampaigns}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Domaines toxiques</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{toxicDomains.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Score SEO moyen prospects</p>
          <div className="mt-2">
            <ScoreBadge score={averageSeoScore} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Actions rapides</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/seo/prospects?action=add" className="rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700">
            Ajouter prospect
          </Link>
          <Link href="/admin/seo/prospects?action=generate-email" className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50">
            Générer email IA
          </Link>
          <Link href="/admin/seo/campaigns?action=create" className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50">
            Créer campagne
          </Link>
          <Link href="/admin/seo/toxic-links?action=add" className="rounded-xl border border-red-300 px-4 py-2 text-center text-sm font-semibold text-red-700 hover:bg-red-50">
            Ajouter domaine toxique
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Derniers prospects ajoutés</h2>
        {prospects.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucun prospect pour le moment.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-3 py-2">Domaine</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Ajouté le</th>
                </tr>
              </thead>
              <tbody>
                {prospects.slice(0, 8).map((prospect) => (
                  <tr key={prospect.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{prospect.domain}</td>
                    <td className="px-3 py-2 text-slate-700">{prospect.category}</td>
                    <td className="px-3 py-2">
                      <ScoreBadge score={prospect.backlink_score} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={prospect.status} />
                    </td>
                    <td className="px-3 py-2 text-slate-600">{new Date(prospect.created_at).toLocaleString("fr-FR")}</td>
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
