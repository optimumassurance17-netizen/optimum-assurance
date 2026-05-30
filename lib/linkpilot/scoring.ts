import { clamp } from "@/optimum-geo-intelligence/lib/utils"

export type BacklinkRecommendation = "excellent" | "good" | "average" | "avoid"

export type BacklinkScoreInput = {
  category?: string | null
  niche?: string | null
  country?: string | null
  domainAuthority?: number | null
  estimatedTraffic?: number | null
  spamScore?: number | null
}

export type BacklinkScoreOutput = {
  backlink_score: number
  relevance_score: number
  recommendation: BacklinkRecommendation
}

const CATEGORY_RELEVANCE_WEIGHTS: Record<string, number> = {
  blog_btp: 100,
  media_construction: 95,
  organisme_professionnel: 90,
  annuaire_artisan: 85,
  courtier_assurance: 80,
  expert_comptable: 70,
  partenaire_local: 75,
  autre: 55,
}

function normalizeTrafficScore(estimatedTraffic: number): number {
  if (estimatedTraffic <= 0) return 0
  if (estimatedTraffic >= 500_000) return 100
  return clamp(Math.round((estimatedTraffic / 500_000) * 100), 0, 100)
}

function normalizeAuthorityScore(domainAuthority: number): number {
  return clamp(Math.round(domainAuthority), 0, 100)
}

function normalizeLowSpamScore(spamScore: number): number {
  return clamp(100 - Math.round(spamScore), 0, 100)
}

function normalizeCountryScore(country?: string | null): number {
  if (!country) return 40
  const normalized = country.toLowerCase()
  if (normalized.includes("france") || normalized.includes("fr")) return 100
  if (normalized.includes("belgique") || normalized.includes("suisse") || normalized.includes("luxembourg")) return 75
  return 35
}

function computeThematicRelevance(category?: string | null, niche?: string | null): number {
  const categoryScore = CATEGORY_RELEVANCE_WEIGHTS[(category ?? "autre").toLowerCase()] ?? 50
  const normalizedNiche = (niche ?? "").toLowerCase()
  const nicheBonus =
    normalizedNiche.includes("btp") ||
    normalizedNiche.includes("construction") ||
    normalizedNiche.includes("assurance") ||
    normalizedNiche.includes("artisan")
      ? 12
      : normalizedNiche.length > 0
        ? 4
        : 0
  return clamp(categoryScore + nicheBonus, 0, 100)
}

export function calculateBacklinkScore(input: BacklinkScoreInput): BacklinkScoreOutput {
  const thematicRelevance = computeThematicRelevance(input.category, input.niche)
  const domainAuthority = normalizeAuthorityScore(Number(input.domainAuthority ?? 0))
  const trafficScore = normalizeTrafficScore(Number(input.estimatedTraffic ?? 0))
  const lowSpamScore = normalizeLowSpamScore(Number(input.spamScore ?? 0))
  const localScore = normalizeCountryScore(input.country ?? "France")

  const weighted =
    thematicRelevance * 0.35 +
    domainAuthority * 0.25 +
    trafficScore * 0.15 +
    lowSpamScore * 0.15 +
    localScore * 0.1

  const backlink_score = clamp(Math.round(weighted), 0, 100)
  const relevance_score = clamp(Math.round((thematicRelevance * 0.65 + localScore * 0.35)), 0, 100)

  let recommendation: BacklinkRecommendation = "average"
  if (backlink_score >= 80 && Number(input.spamScore ?? 0) <= 25) {
    recommendation = "excellent"
  } else if (backlink_score >= 65 && Number(input.spamScore ?? 0) <= 40) {
    recommendation = "good"
  } else if (backlink_score < 45 || Number(input.spamScore ?? 0) >= 65) {
    recommendation = "avoid"
  }

  return {
    backlink_score,
    relevance_score,
    recommendation,
  }
}
