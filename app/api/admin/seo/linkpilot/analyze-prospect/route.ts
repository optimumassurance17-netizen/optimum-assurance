import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import OpenAI from "openai"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { calculateBacklinkScore } from "@/lib/linkpilot/scoring"

const payloadSchema = z.object({
  domain: z.string().min(3),
  url: z.string().url(),
  category: z.string().min(2),
  niche: z.string().min(2),
  domain_authority: z.number().int().min(0).max(100),
  estimated_traffic: z.number().int().min(0),
  spam_score: z.number().int().min(0).max(100),
  country: z.string().default("France"),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 })
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  const score = calculateBacklinkScore({
    category: input.category,
    niche: input.niche,
    country: input.country,
    domainAuthority: input.domain_authority,
    estimatedTraffic: input.estimated_traffic,
    spamScore: input.spam_score,
  })

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({
      relevance_score: score.relevance_score,
      backlink_score: score.backlink_score,
      recommendation: score.recommendation,
      ai_notes:
        "Analyse IA non disponible (OPENAI_API_KEY absent). Scoring algorithmique appliqué avec succès.",
    })
  }

  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Tu es un analyste SEO senior. Réponds en français court, factuel, orienté décision netlinking, sans inciter au spam.",
      },
      {
        role: "user",
        content: [
          "Analyse ce prospect de backlink pour Optimum Assurance :",
          `Domaine: ${input.domain}`,
          `URL: ${input.url}`,
          `Catégorie: ${input.category}`,
          `Niche: ${input.niche}`,
          `Domain authority: ${input.domain_authority}`,
          `Trafic estimé: ${input.estimated_traffic}`,
          `Spam score: ${input.spam_score}`,
          `Pays: ${input.country}`,
          `Score calculé: ${score.backlink_score}/100 (${score.recommendation})`,
          "Retourne uniquement un JSON: {\"ai_notes\":\"...\"}",
        ].join("\n"),
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  let ai_notes =
    "Prospect analysé avec méthode hybride. Vérifier manuellement la qualité éditoriale de la page avant outreach."
  try {
    const parsedJson = JSON.parse(raw) as { ai_notes?: string }
    if (parsedJson.ai_notes?.trim()) ai_notes = parsedJson.ai_notes.trim()
  } catch {
    ai_notes = raw || ai_notes
  }

  return NextResponse.json({
    relevance_score: score.relevance_score,
    backlink_score: score.backlink_score,
    recommendation: score.recommendation,
    ai_notes,
  })
}
