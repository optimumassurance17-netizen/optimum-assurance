import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import OpenAI from "openai"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import {
  LINKABLE_ASSETS,
  LINKPILOT_GUARDRAILS,
  NATURAL_ANCHOR_SUGGESTIONS,
} from "@/lib/linkpilot/constants"
import { checkRateLimitMemory, getClientIp } from "@/lib/rate-limit"

const payloadSchema = z.object({
  domain: z.string().min(3),
  url: z.string().url(),
  category: z.string().min(2),
  niche: z.string().min(2),
  targetPage: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 })
  }

  const ip = getClientIp(request)
  const rl = checkRateLimitMemory(
    `linkpilot:generate-email:${ip}`,
    LINKPILOT_GUARDRAILS.maxDraftGenerationPerMinute,
    60_000
  )
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de générations. Réessayez dans quelques secondes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    )
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide", details: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  if (!LINKABLE_ASSETS.includes(input.targetPage as (typeof LINKABLE_ASSETS)[number])) {
    return NextResponse.json({ error: "Page cible non autorisée pour le netlinking." }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY manquant" }, { status: 503 })
  }

  const client = new OpenAI({ apiKey })
  const prompt = [
    "Rédige un email d’outreach backlink en français, professionnel, humain, non spammy.",
    `Site prospect: ${input.domain}`,
    `URL prospect: ${input.url}`,
    `Catégorie: ${input.category}`,
    `Niche: ${input.niche}`,
    `Page cible Optimum Assurance: https://optimum-assurance.fr${input.targetPage}`,
    `Ancres naturelles autorisées: ${NATURAL_ANCHOR_SUGGESTIONS.join(", ")}`,
    "Ne jamais proposer d'échange agressif, ni d'automatisation, ni de publication en masse.",
    "Objectif: proposer une ressource utile pour leur audience et demander une mention éditoriale naturelle.",
    "Retourne uniquement JSON: {\"subject\":\"...\",\"body\":\"...\"}",
  ].join("\n")

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content:
          "Tu es un expert SEO éthique. Tu refuses le spam, les ancres suroptimisées et l'outreach abusif.",
      },
      { role: "user", content: prompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  try {
    const parsedJson = JSON.parse(raw) as { subject?: string; body?: string }
    if (!parsedJson.subject || !parsedJson.body) {
      throw new Error("Réponse incomplète")
    }
    return NextResponse.json({
      subject: parsedJson.subject,
      body: parsedJson.body,
    })
  } catch {
    return NextResponse.json(
      {
        subject: `Proposition de ressource utile pour vos lecteurs (${input.domain})`,
        body: `Bonjour,\n\nJe vous contacte car votre contenu sur ${input.niche} est particulièrement pertinent. Nous avons publié sur Optimum Assurance une ressource utile qui peut intéresser votre audience : https://optimum-assurance.fr${input.targetPage}\n\nSi vous jugez le contenu utile, seriez-vous ouvert à l'ajouter comme source complémentaire dans un article existant ou futur ?\n\nMerci pour votre retour,\nL'équipe Optimum Assurance\ncontact@optimum-assurance.fr`,
      },
      { status: 200 }
    )
  }
}
