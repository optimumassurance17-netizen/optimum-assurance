import { OGI_AI_PROVIDERS } from "@/optimum-geo-intelligence/lib/constants"
import type { OgiAiProvider, OgiDashboardSnapshot } from "@/optimum-geo-intelligence/types"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

function toKeyedProviderMap(items: Array<{ provider: OgiAiProvider; geo_score: number }>) {
  const init = Object.fromEntries(OGI_AI_PROVIDERS.map((provider) => [provider, 0])) as Record<OgiAiProvider, number>
  for (const provider of OGI_AI_PROVIDERS) {
    const subset = items.filter((item) => item.provider === provider)
    if (subset.length === 0) continue
    init[provider] = Math.round(subset.reduce((acc, item) => acc + Number(item.geo_score), 0) / subset.length)
  }
  return init
}

export async function getDashboardSnapshot(): Promise<OgiDashboardSnapshot> {
  const sb = getSupabaseAdminClient()
  const [globalScoreRes, seoRes, geoRes, alertsRes, generatedRes, competitorRes, trendRes] = await Promise.all([
    sb.from("geo_scores").select("score").eq("scope_type", "global").order("measured_at", { ascending: false }).limit(1),
    sb.from("seo_scores").select("score").order("measured_at", { ascending: false }).limit(60),
    sb.from("geo_results").select("provider,geo_score,captured_at").order("captured_at", { ascending: false }).limit(120),
    sb.from("alerts").select("id").eq("status", "open"),
    sb.from("generated_content").select("id,status,created_at").order("created_at", { ascending: false }).limit(200),
    sb.from("competitor_pages").select("id,is_new,crawled_at").order("crawled_at", { ascending: false }).limit(120),
    sb.from("daily_snapshots").select("snapshot_date,geo_score,seo_score").order("snapshot_date", { ascending: false }).limit(7),
  ])

  const geoScoreGlobal = Number(globalScoreRes.data?.[0]?.score ?? 0)
  const seoScoreGlobal = Math.round(
    ((seoRes.data ?? []).reduce((acc, item) => acc + Number(item.score), 0) || 0) / Math.max((seoRes.data ?? []).length, 1)
  )

  const contentFreshness = Math.round(
    ((generatedRes.data ?? []).reduce((acc, item) => {
      const ageDays = (Date.now() - new Date(item.created_at).getTime()) / 86_400_000
      return acc + Math.max(20, 100 - ageDays * 2.8)
    }, 0) || 0) / Math.max((generatedRes.data ?? []).length, 1)
  )

  const byProvider = toKeyedProviderMap(
    (geoRes.data ?? []).map((item) => ({
      provider: item.provider as OgiAiProvider,
      geo_score: Number(item.geo_score),
    }))
  )

  return {
    geoScoreGlobal,
    seoScoreGlobal,
    contentFreshness,
    activeAlerts: alertsRes.data?.length ?? 0,
    generatedPagesCount: generatedRes.data?.length ?? 0,
    competitorDeltaCount: (competitorRes.data ?? []).filter((item) => item.is_new).length,
    byProvider,
    trend7d: (trendRes.data ?? [])
      .map((item) => ({
        date: item.snapshot_date,
        geoScore: Number(item.geo_score ?? 0),
        seoScore: Number(item.seo_score ?? 0),
      }))
      .reverse(),
  }
}

export async function listAlerts(limit = 50) {
  const sb = getSupabaseAdminClient()
  const { data, error } = await sb
    .from("alerts")
    .select("id,category,title,message,severity,status,created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function listCompetitorChanges(limit = 80) {
  const sb = getSupabaseAdminClient()
  const { data, error } = await sb
    .from("competitor_pages")
    .select("id,url,title,seo_score,is_new,changed_fields,crawled_at,competitors(name)")
    .order("crawled_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
