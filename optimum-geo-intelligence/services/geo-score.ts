import { avg, clamp, todayIsoDate } from "@/optimum-geo-intelligence/lib/utils"
import type { OgiGeoScoreBreakdown } from "@/optimum-geo-intelligence/types"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

function computeFormula(input: OgiGeoScoreBreakdown): number {
  const total =
    input.seoScore +
    input.contentScore +
    input.freshnessScore +
    input.visibilityScore +
    input.authorityScore
  return clamp(Math.round(total / 5), 0, 100)
}

export async function computeGlobalGeoScore() {
  const sb = getSupabaseAdminClient()
  const [seoRes, geoRes, contentRes, compRes] = await Promise.all([
    sb.from("seo_scores").select("score").order("measured_at", { ascending: false }).limit(100),
    sb.from("geo_results").select("geo_score").order("captured_at", { ascending: false }).limit(100),
    sb.from("generated_content").select("created_at,status").order("created_at", { ascending: false }).limit(200),
    sb.from("competitor_pages").select("seo_score").order("crawled_at", { ascending: false }).limit(120),
  ])

  const seoScore = avg((seoRes.data ?? []).map((v) => Number(v.score) || 0))
  const visibilityScore = avg((geoRes.data ?? []).map((v) => Number(v.geo_score) || 0))

  const now = Date.now()
  const contentFreshnessValues = (contentRes.data ?? []).map((item) => {
    const days = (now - new Date(item.created_at).getTime()) / 86_400_000
    const freshness = clamp(100 - days * 2.5, 20, 100)
    return item.status === "published" ? freshness : freshness * 0.6
  })

  const contentScore = avg(
    (contentRes.data ?? []).map((item) => (item.status === "published" ? 80 : item.status === "approved" ? 65 : 45))
  )
  const freshnessScore = avg(contentFreshnessValues)
  const authorityScore = avg((compRes.data ?? []).map((v) => Number(v.seo_score) || 50)) * 0.75

  const breakdown: OgiGeoScoreBreakdown = {
    seoScore,
    contentScore,
    freshnessScore,
    visibilityScore,
    authorityScore,
  }

  const score = computeFormula(breakdown)
  await sb.from("geo_scores").insert({
    scope_type: "global",
    scope_key: "all",
    score,
    details: breakdown,
    measured_at: new Date().toISOString(),
  })

  return { score, breakdown }
}

export async function computeScopedGeoScores() {
  const sb = getSupabaseAdminClient()
  const { data: content } = await sb
    .from("generated_content")
    .select("path,city_name,profession_name,status,created_at")
    .limit(500)

  const scopes = new Map<string, Array<{ status: string; createdAt: string }>>()
  for (const row of content ?? []) {
    const cityKey = row.city_name ? `city:${row.city_name.toLowerCase()}` : null
    const professionKey = row.profession_name ? `profession:${row.profession_name.toLowerCase()}` : null
    const keys = [cityKey, professionKey].filter((value): value is string => Boolean(value))
    for (const key of keys) {
      const list = scopes.get(key)
      const item = { status: row.status, createdAt: row.created_at }
      if (list) list.push(item)
      else scopes.set(key, [item])
    }
  }

  for (const [scope, entries] of scopes) {
    const freshness = avg(
      entries.map((entry) => {
        const days = (Date.now() - new Date(entry.createdAt).getTime()) / 86_400_000
        return clamp(100 - days * 3, 20, 100)
      })
    )
    const contentScore = avg(entries.map((entry) => (entry.status === "published" ? 80 : 50)))
    const score = computeFormula({
      seoScore: 65,
      contentScore,
      freshnessScore: freshness,
      visibilityScore: 60,
      authorityScore: 55,
    })

    await sb.from("geo_scores").insert({
      scope_type: scope.startsWith("city:") ? "city" : "profession",
      scope_key: scope.replace(/^(city:|profession:)/, ""),
      score,
      details: { contentCount: entries.length, computedAt: todayIsoDate() },
      measured_at: new Date().toISOString(),
    })
  }

  return { scopedCount: scopes.size }
}
