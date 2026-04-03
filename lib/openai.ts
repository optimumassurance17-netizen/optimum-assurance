import OpenAI from "openai"

export type SEOGenerationUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export type SEOGenerationResult = {
  /** Réponse brute (JSON ou texte) */
  raw: string
  usage?: SEOGenerationUsage
  model: string
}

/**
 * Client OpenAI — exige OPENAI_API_KEY dans l’environnement.
 */
export function createOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

/**
 * Modèle par défaut : GPT-4o (qualité SEO). Surcharge via OPENAI_MODEL (ex. gpt-4o-mini, gpt-4.1).
 */
export function getDefaultOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o"
}

export type GenerateSEOContentOptions = {
  model?: string
  maxCompletionTokens?: number
  temperature?: number
  jsonMode?: boolean
}

const DEFAULT_SYSTEM_SINGLE_PROMPT =
  "Tu es un expert en assurance construction (décennale, dommage ouvrage) et SEO pour le marché français. Réponds avec rigueur, nuances juridiques et style naturel."

/**
 * Génération SEO : soit un seul prompt utilisateur (système par défaut), soit système + utilisateur.
 */
export async function generateSEOContent(
  systemOrUserPrompt: string,
  userPromptOrOptions?: string | GenerateSEOContentOptions,
  maybeOptions?: GenerateSEOContentOptions
): Promise<SEOGenerationResult> {
  let systemPrompt: string
  let userPrompt: string
  let options: GenerateSEOContentOptions | undefined

  if (typeof userPromptOrOptions === "string") {
    systemPrompt = systemOrUserPrompt
    userPrompt = userPromptOrOptions
    options = maybeOptions
  } else {
    systemPrompt = DEFAULT_SYSTEM_SINGLE_PROMPT
    userPrompt = systemOrUserPrompt
    options = userPromptOrOptions
  }

  const client = createOpenAIClient()
  if (!client) {
    throw new Error("OPENAI_API_KEY manquant — impossible d’appeler OpenAI.")
  }

  const model = options?.model ?? getDefaultOpenAIModel()
  const maxCompletionTokens = options?.maxCompletionTokens ?? 4096
  const temperature = options?.temperature ?? 0.65

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...(options?.jsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
    max_completion_tokens: maxCompletionTokens,
    temperature,
  })

  const choice = response.choices[0]?.message?.content
  if (!choice) {
    throw new Error("Réponse OpenAI vide.")
  }

  const usage = response.usage
    ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      }
    : undefined

  return { raw: choice, usage, model }
}

/** Estimation coût USD (ordre de grandeur — à ajuster selon la grille OpenAI en vigueur). */
export function estimateCostUsd(
  model: string,
  usage: SEOGenerationUsage
): number {
  const per1k = MODEL_PRICE_PER_1K_TOKENS[model] ?? MODEL_PRICE_PER_1K_TOKENS.default
  const k = usage.total_tokens / 1000
  return Math.round(k * per1k * 10000) / 10000
}

/** Prix indicatifs au 1k tokens (input+output moyenné grossièrement). */
const MODEL_PRICE_PER_1K_TOKENS: Record<string, number> = {
  "gpt-4o": 0.008,
  "gpt-4o-mini": 0.0004,
  "gpt-4.1": 0.01,
  "gpt-4.1-mini": 0.0006,
  default: 0.01,
}
