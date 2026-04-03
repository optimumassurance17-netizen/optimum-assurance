import { generateSEOContent, type SEOGenerationResult } from "@/lib/openai"
import type { AiPagePayload, AiTone, MetierContext, TypeProjetContext, VilleContext } from "./types"
import { buildDecennaleUserPrompt, buildDOUserPrompt, SYSTEM_PROMPT_JSON } from "./prompt-builder"

function parseAiJson(raw: string): AiPagePayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("Réponse OpenAI non JSON valide.")
  }
  if (!parsed || typeof parsed !== "object") throw new Error("JSON racine invalide.")
  const o = parsed as Record<string, unknown>

  const title = String(o.title ?? "").trim()
  const meta_description = String(o.meta_description ?? "").trim()
  const h1 = String(o.h1 ?? "").trim()
  const content_markdown = String(o.content_markdown ?? "").trim()
  const angle_editorial = String(o.angle_editorial ?? "").trim()

  if (!title || !meta_description || !h1 || !content_markdown) {
    throw new Error("Champs title, meta_description, h1 ou content_markdown manquants.")
  }

  const faqRaw = o.faq
  const faq: { q: string; r: string }[] = []
  if (Array.isArray(faqRaw)) {
    for (const item of faqRaw) {
      if (item && typeof item === "object") {
        const q = String((item as { q?: string }).q ?? "").trim()
        const r = String((item as { r?: string }).r ?? "").trim()
        if (q && r) faq.push({ q, r })
      }
    }
  }

  const sk = o.secondary_keywords
  const secondary_keywords: string[] = []
  if (Array.isArray(sk)) {
    for (const s of sk) {
      if (typeof s === "string" && s.trim()) secondary_keywords.push(s.trim())
    }
  }

  return {
    title,
    meta_description,
    h1,
    content_markdown,
    faq,
    secondary_keywords,
    angle_editorial: angle_editorial || "—",
  }
}

export type GenerateOptions = {
  tone?: AiTone
  /** Variation structurelle (anti-duplicate entre relances) */
  variationIndex?: number
}

/**
 * Page assurance décennale (métier × contexte ville).
 */
export async function generatePageContent(
  metier: MetierContext,
  ville: VilleContext,
  options?: GenerateOptions
): Promise<{ payload: AiPagePayload; usageCost: SEOGenerationResult }> {
  const tone = options?.tone ?? pickTone(metier.slug, ville.slug)
  const variationIndex = options?.variationIndex ?? 0
  const { userPrompt } = buildDecennaleUserPrompt(metier, ville, tone, variationIndex)

  const result = await generateSEOContent(SYSTEM_PROMPT_JSON, userPrompt, {
    jsonMode: true,
    temperature: 0.62 + (variationIndex % 5) * 0.03,
  })

  const payload = parseAiJson(result.raw)
  return { payload, usageCost: result }
}

/**
 * Page dommage ouvrage (type de projet × ville).
 */
export async function generateDOContent(
  typeProjet: TypeProjetContext,
  ville: VilleContext,
  options?: GenerateOptions
): Promise<{ payload: AiPagePayload; usageCost: SEOGenerationResult }> {
  const tone = options?.tone ?? pickTone(typeProjet.slug, ville.slug)
  const variationIndex = options?.variationIndex ?? 0
  const { userPrompt } = buildDOUserPrompt(typeProjet, ville, tone, variationIndex)

  const result = await generateSEOContent(SYSTEM_PROMPT_JSON, userPrompt, {
    jsonMode: true,
    temperature: 0.62 + (variationIndex % 5) * 0.03,
  })

  const payload = parseAiJson(result.raw)
  return { payload, usageCost: result }
}

function pickTone(a: string, b: string): AiTone {
  const n = (a + b).length
  return n % 2 === 0 ? "premium" : "accessible"
}
