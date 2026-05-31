import type { OGI_AI_PROVIDERS } from "@/optimum-geo-intelligence/lib/constants"

export type OgiAiProvider = (typeof OGI_AI_PROVIDERS)[number]

export type OgiAlertSeverity = "low" | "medium" | "high" | "critical"

export type OgiGeneratedContentType =
  | "article"
  | "faq"
  | "guide"
  | "metier"
  | "local-city"
  | "local-metier-city"

export type OgiGeoScoreBreakdown = {
  seoScore: number
  contentScore: number
  freshnessScore: number
  visibilityScore: number
  authorityScore: number
}

export type OgiCompetitorPageExtract = {
  title: string
  metaDescription: string
  h1: string
  h2: string[]
  faq: string[]
  schemas: string[]
  bodyText: string
  seoScore: number
}

export type OgiGeoPresence = {
  brandMentions: number
  competitorMentions: number
  totalTokens: number
  visibilityRatio: number
}

export type OgiDashboardSnapshot = {
  geoScoreGlobal: number
  seoScoreGlobal: number
  contentFreshness: number
  activeAlerts: number
  generatedPagesCount: number
  competitorDeltaCount: number
  byProvider: Record<OgiAiProvider, number>
  trend7d: Array<{ date: string; geoScore: number; seoScore: number }>
}

export type OgiContentDraft = {
  title: string
  slug: string
  seoTitle: string
  metaDescription: string
  h1: string
  sections: Array<{ heading: string; body: string }>
  faq: Array<{ question: string; answer: string }>
  faqSchemaJson: string
  jsonLd: string
  internalLinks: string[]
  ctaLabel: string
  ctaHref: string
}
