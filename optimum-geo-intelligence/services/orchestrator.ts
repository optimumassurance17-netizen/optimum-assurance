import { runAlertCenter } from "@/optimum-geo-intelligence/services/alerts"
import { runCompetitorTracker } from "@/optimum-geo-intelligence/services/competitor-tracker"
import { runGeoPageBuilder } from "@/optimum-geo-intelligence/services/geo-page-builder"
import { computeGlobalGeoScore, computeScopedGeoScores } from "@/optimum-geo-intelligence/services/geo-score"
import { runGeoVisibilityAnalysis } from "@/optimum-geo-intelligence/services/geo-visibility"
import { scanAndScoreSeoPages } from "@/optimum-geo-intelligence/services/seo-optimizer"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

export async function runDailySnapshot() {
  const sb = getSupabaseAdminClient()
  const [global, seoScan] = await Promise.all([computeGlobalGeoScore(), scanAndScoreSeoPages()])
  await computeScopedGeoScores()
  await sb.from("daily_snapshots").upsert(
    {
      snapshot_date: new Date().toISOString().slice(0, 10),
      geo_score: global.score,
      seo_score: global.breakdown.seoScore,
      payload: { seoScan },
    },
    { onConflict: "snapshot_date" }
  )
  return { global, seoScan }
}

export async function runScheduledStep(step: "competitor" | "geo" | "content" | "optimizer" | "alerts" | "snapshot") {
  switch (step) {
    case "competitor":
      return runCompetitorTracker()
    case "geo":
      return runGeoVisibilityAnalysis()
    case "content":
      return runGeoPageBuilder({ maxCities: 3, maxProfessions: 4 })
    case "optimizer":
      return scanAndScoreSeoPages()
    case "alerts":
      return runAlertCenter()
    case "snapshot":
      return runDailySnapshot()
    default:
      return { ok: true }
  }
}
