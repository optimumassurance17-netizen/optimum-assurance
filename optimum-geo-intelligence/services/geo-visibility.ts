import OpenAI from "openai"
import { OGI_AI_PROVIDERS, OGI_BRAND_TERMS, OGI_GEO_QUERY_SEEDS } from "@/optimum-geo-intelligence/lib/constants"
import { avg, clamp } from "@/optimum-geo-intelligence/lib/utils"
import { logAiReport } from "@/optimum-geo-intelligence/services/audit-log"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

function countMentions(text: string, terms: string[]): number {
  const normalized = text.toLowerCase()
  return terms.reduce((count, term) => {
    if (!term) return count
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const matches = normalized.match(new RegExp(escaped, "gi"))
    return count + (matches?.length ?? 0)
  }, 0)
}

async function ensureGeoSeeds() {
  const sb = getSupabaseAdminClient()
  const { data: existing } = await sb.from("geo_queries").select("query")
  const current = new Set((existing ?? []).map((item) => item.query.toLowerCase().trim()))
  const missing = OGI_GEO_QUERY_SEEDS.filter((query) => !current.has(query.toLowerCase()))
  if (missing.length > 0) {
    await sb.from("geo_queries").insert(missing.map((query) => ({ query, is_active: true })))
  }
}

async function generateProviderAnswer(
  query: string,
  provider: (typeof OGI_AI_PROVIDERS)[number],
  competitors: string[]
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return `Provider=${provider}. Réponse indisponible (OPENAI_API_KEY absent).`
  }
  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Tu analyses la visibilité d'une marque en assurance décennale. Réponds en français en citant des acteurs du marché, de façon synthétique et factuelle.",
      },
      {
        role: "user",
        content: [
          `Fais une réponse représentative de ${provider} à la requête suivante : "${query}".`,
          "Inclure un classement court des acteurs les plus visibles.",
          `Concurrents observés: ${competitors.join(", ") || "aucun"}.`,
          "Le résultat doit tenir en 120-180 mots.",
        ].join("\n"),
      },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() ?? ""
}

function computeGeoScore(brandMentions: number, competitorMentions: number, visibilityRatio: number): number {
  const mentionBalance = brandMentions - competitorMentions * 0.4
  const raw = visibilityRatio * 70 + mentionBalance * 6 + 20
  return clamp(Math.round(raw), 0, 100)
}

export async function runGeoVisibilityAnalysis(options?: {
  queryId?: string
  query?: string
  provider?: (typeof OGI_AI_PROVIDERS)[number]
}) {
  await ensureGeoSeeds()
  const sb = getSupabaseAdminClient()

  const { data: activeQueries, error: queryError } = options?.queryId
    ? await sb.from("geo_queries").select("id,query").eq("id", options.queryId).eq("is_active", true).limit(1)
    : options?.query
      ? await sb.from("geo_queries").select("id,query").eq("query", options.query).eq("is_active", true).limit(1)
      : await sb.from("geo_queries").select("id,query").eq("is_active", true)
  if (queryError) throw queryError
  if (!activeQueries?.length) return { processed: 0, providers: 0 }

  const { data: competitors } = await sb.from("competitors").select("name").eq("is_active", true)
  const competitorNames = (competitors ?? []).map((entry) => entry.name).filter(Boolean)
  const providers = options?.provider ? [options.provider] : [...OGI_AI_PROVIDERS]

  let processed = 0
  const collectedScores: number[] = []

  for (const query of activeQueries) {
    for (const provider of providers) {
      const answer = await generateProviderAnswer(query.query, provider, competitorNames)
      const brandMentions = countMentions(answer, OGI_BRAND_TERMS)
      const competitorMentions = countMentions(answer, competitorNames.map((value) => value.toLowerCase()))
      const tokenCount = answer.split(/\s+/).filter(Boolean).length
      const visibilityRatio = tokenCount > 0 ? brandMentions / tokenCount : 0
      const geoScore = computeGeoScore(brandMentions, competitorMentions, visibilityRatio)
      collectedScores.push(geoScore)

      const { error: resultError } = await sb.from("geo_results").insert({
        query_id: query.id,
        provider,
        response_text: answer,
        brand_mentions: brandMentions,
        competitor_mentions: competitorMentions,
        total_tokens: tokenCount,
        visibility_ratio: visibilityRatio,
        geo_score: geoScore,
      })

      if (resultError) {
        console.error("[OGI] geo_results insert:", resultError)
      } else {
        processed++
      }
    }
  }

  const globalScore = Math.round(avg(collectedScores))
  await sb.from("geo_scores").insert({
    scope_type: "global",
    scope_key: "all",
    score: globalScore,
    details: { providers, processed },
    measured_at: new Date().toISOString(),
  })

  await logAiReport({
    reportType: "geo_visibility",
    status: "success",
    title: "Analyse GEO terminée",
    summary: `${processed} résultats IA analysés`,
    payload: { providers, processed, globalScore },
  })

  return { processed, providers: providers.length, globalScore }
}
