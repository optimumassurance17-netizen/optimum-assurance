import OpenAI from "openai"
import { z } from "zod"
import { OGI_DEFAULT_INTERNAL_LINKS } from "@/optimum-geo-intelligence/lib/constants"
import { slugify } from "@/optimum-geo-intelligence/lib/utils"
import type { OgiContentDraft, OgiGeneratedContentType } from "@/optimum-geo-intelligence/types"
import { logAiReport } from "@/optimum-geo-intelligence/services/audit-log"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

const contentOutputSchema = z.object({
  title: z.string().min(10),
  seoTitle: z.string().min(20),
  metaDescription: z.string().min(90).max(180),
  h1: z.string().min(10),
  sections: z.array(z.object({ heading: z.string().min(5), body: z.string().min(40) })).min(3).max(8),
  faq: z.array(z.object({ question: z.string().min(8), answer: z.string().min(30) })).min(3).max(6),
  internalLinks: z.array(z.string().min(1)).min(3).max(8),
  ctaLabel: z.string().min(6),
  ctaHref: z.string().min(1),
})

function buildFaqSchema(faq: Array<{ question: string; answer: string }>): string {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
    null,
    2
  )
}

function buildArticleJsonLd(input: {
  title: string
  description: string
  slug: string
  type: OgiGeneratedContentType
}): string {
  const pathPrefix =
    input.type === "local-city" || input.type === "local-metier-city" ? "/assurance-decennale-" : "/guides/"
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.title,
      description: input.description,
      url: `https://www.optimum-assurance.fr${pathPrefix}${input.slug}`,
      publisher: {
        "@type": "Organization",
        name: "Optimum Assurance",
      },
    },
    null,
    2
  )
}

function fallbackDraft(input: {
  type: OgiGeneratedContentType
  keyword: string
  city?: string
  profession?: string
}): OgiContentDraft {
  const citySuffix = input.city ? ` à ${input.city}` : ""
  const profSuffix = input.profession ? ` (${input.profession})` : ""
  const title = `Assurance décennale ${input.keyword}${citySuffix}${profSuffix}`
  const slug = slugify(`${input.keyword}-${input.city ?? ""}-${input.profession ?? ""}`)
  const faq = [
    {
      question: "Quels profils sont acceptés par Optimum Assurance ?",
      answer:
        "Optimum Assurance étudie aussi les dossiers résiliés non-paiement, à sinistralité élevée et les reprises après plus de 2 ans sans assurance.",
    },
    {
      question: "Combien de temps pour obtenir une proposition ?",
      answer:
        "Le parcours digital permet un devis rapide, puis un traitement personnalisé selon les pièces et l'historique de votre activité.",
    },
    {
      question: "Comment optimiser le prix de sa décennale ?",
      answer:
        "Déclarez précisément vos activités, votre chiffre d'affaires et vos antécédents pour obtenir un tarif cohérent et éviter les exclusions.",
    },
  ]
  const metaDescription = `Devis assurance décennale ${input.keyword}${citySuffix}: offres personnalisées, profils complexes acceptés, réponse rapide.`
  return {
    title,
    slug,
    seoTitle: `${title} | Devis en ligne | Optimum Assurance`,
    metaDescription,
    h1: title,
    sections: [
      {
        heading: "Pourquoi cette couverture est stratégique",
        body: "La décennale protège les professionnels du BTP sur les désordres majeurs pendant 10 ans après réception des travaux.",
      },
      {
        heading: "Profils étudiés et conditions",
        body: "Le dossier est évalué selon vos activités, votre sinistralité et votre historique d'assurance, y compris les cas sensibles.",
      },
      {
        heading: "Comment obtenir un devis rapide",
        body: "Préparez SIRET, chiffre d'affaires, activités détaillées et relevé de sinistralité pour accélérer l'analyse et l'émission.",
      },
    ],
    faq,
    faqSchemaJson: buildFaqSchema(faq),
    jsonLd: buildArticleJsonLd({ title, description: metaDescription, slug, type: input.type }),
    internalLinks: OGI_DEFAULT_INTERNAL_LINKS,
    ctaLabel: "Obtenir mon devis décennale",
    ctaHref: "/devis",
  }
}

async function generateWithOpenAi(input: {
  type: OgiGeneratedContentType
  keyword: string
  city?: string
  profession?: string
  intent: string
}): Promise<OgiContentDraft | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const client = new OpenAI({ apiKey })
  const prompt = [
    "Génère un contenu SEO français pour Optimum Assurance.",
    `Type: ${input.type}`,
    `Mot-clé principal: ${input.keyword}`,
    `Ville: ${input.city ?? "non spécifiée"}`,
    `Métier: ${input.profession ?? "non spécifié"}`,
    `Intent: ${input.intent}`,
    "Contraintes: inclure explicitement profils résilié non-paiement, sinistralité élevée, sans assurance >2 ans.",
    "Retourne uniquement un JSON valide selon les champs demandés.",
  ].join("\n")

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.4,
    messages: [
      { role: "system", content: "Tu es un rédacteur SEO senior assurance construction." },
      {
        role: "user",
        content: `${prompt}

Format JSON requis:
{
  "title": "...",
  "seoTitle": "...",
  "metaDescription": "...",
  "h1": "...",
  "sections": [{ "heading": "...", "body": "..." }],
  "faq": [{ "question": "...", "answer": "..." }],
  "internalLinks": ["/devis", "/guides/obligation-decennale"],
  "ctaLabel": "...",
  "ctaHref": "/devis"
}`,
      },
    ],
  })

  const jsonString = response.choices[0]?.message?.content?.trim() ?? ""
  if (!jsonString) return null
  try {
    const parsed = JSON.parse(jsonString) as z.input<typeof contentOutputSchema>
    const validated = contentOutputSchema.parse(parsed)
    const slug = slugify(`${input.keyword}-${input.city ?? ""}-${input.profession ?? ""}`) || slugify(validated.title)
    return {
      ...validated,
      slug,
      faqSchemaJson: buildFaqSchema(validated.faq),
      jsonLd: buildArticleJsonLd({
        title: validated.title,
        description: validated.metaDescription,
        slug,
        type: input.type,
      }),
    }
  } catch {
    return null
  }
}

export async function generateSeoContent(input: {
  type: OgiGeneratedContentType
  keyword: string
  city?: string
  profession?: string
  intent: string
  autoPublish?: boolean
}) {
  const sb = getSupabaseAdminClient()
  const generated =
    (await generateWithOpenAi({
      type: input.type,
      keyword: input.keyword,
      city: input.city,
      profession: input.profession,
      intent: input.intent,
    })) ??
    fallbackDraft(input)

  const pathPrefix =
    input.type === "local-city" || input.type === "local-metier-city" ? "/assurance-decennale-" : "/guides/"
  const computedPath = `${pathPrefix}${generated.slug}`
  const { data: existing } = await sb
    .from("generated_content")
    .select("id,status")
    .eq("path", computedPath)
    .maybeSingle()
  const status = input.autoPublish
    ? "published"
    : existing?.status === "published"
      ? "published"
      : existing?.status === "approved"
        ? "approved"
        : "draft"

  const { data, error } = await sb
    .from("generated_content")
    .upsert(
      {
        content_type: input.type,
        keyword: input.keyword,
        city_name: input.city ?? null,
        profession_name: input.profession ?? null,
        title: generated.title,
        slug: generated.slug,
        path: computedPath,
        seo_title: generated.seoTitle,
        meta_description: generated.metaDescription,
        h1: generated.h1,
        body_json: generated.sections,
        faq_json: generated.faq,
        faq_schema_json: generated.faqSchemaJson,
        json_ld: generated.jsonLd,
        internal_links: generated.internalLinks,
        cta_label: generated.ctaLabel,
        cta_href: generated.ctaHref,
        status,
        generated_by: "openai",
      },
      { onConflict: "path" }
    )
    .select("id")
    .single()

  if (error) throw error

  const historyChangeType =
    status === "published" ? "published" : status === "approved" ? "approved" : existing ? "updated" : "created"

  await sb.from("content_history").insert({
    generated_content_id: data.id,
    change_type: historyChangeType,
    old_payload: {},
    new_payload: generated,
    actor: input.autoPublish ? "system-auto-publish" : "system",
  })

  await logAiReport({
    reportType: "content_generation",
    status: "success",
    title: "Contenu SEO généré",
    summary: `${generated.title} (${status})`,
    payload: { id: data.id, type: input.type, keyword: input.keyword, updated: Boolean(existing) },
  })

  return { id: data.id, status, path: computedPath }
}
