import { createHash } from "node:crypto"
import OpenAI from "openai"
import { buildStaticSitemapEntries } from "@/lib/sitemap/build-sitemap-entries"
import { SITE_URL } from "@/lib/site-url"
import { logAiReport } from "@/optimum-geo-intelligence/services/audit-log"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

type SeoRecommendation = {
  title: string
  h1: string
  metaDescription: string
  faq: Array<{ question: string; answer: string }>
  internalLinks: string[]
}

type SeoScanOptions = {
  autoApply?: boolean
  autoPublishGenerated?: boolean
}

function parsePageSignals(html: string) {
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  const plainText = textOnly.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const title = /<title[^>]*>(.*?)<\/title>/i.exec(html)?.[1]?.trim() ?? ""
  const h1 = /<h1[^>]*>(.*?)<\/h1>/i.exec(html)?.[1]?.trim() ?? ""
  const hasFaqSchema = /"@type"\s*:\s*"FAQPage"/i.test(html)
  const hasSchema = /application\/ld\+json/i.test(html)
  const wordCount = plainText.split(/\s+/).filter(Boolean).length
  return { title, h1, hasFaqSchema, hasSchema, wordCount, plainText }
}

async function buildRecommendation(path: string, title: string, body: string): Promise<SeoRecommendation> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return {
      title: `${title || "Assurance décennale"} | Optimum Assurance`,
      h1: title || "Assurance décennale : optimisation de contenu",
      metaDescription:
        "Optimisez votre visibilité SEO et GEO avec un contenu expert sur l'assurance décennale, pensé pour convertir les demandes de devis.",
      faq: [
        {
          question: "Quels profils peuvent être assurés en décennale ?",
          answer:
            "Le dossier est étudié même en cas de résiliation non-paiement, sinistralité élevée ou période sans assurance prolongée.",
        },
        {
          question: "Comment améliorer la conversion d'une page SEO ?",
          answer:
            "Ajoutez une FAQ utile, un CTA clair vers le devis et des liens internes cohérents vers les pages transactionnelles.",
        },
      ],
      internalLinks: ["/devis", "/devis-assurance-decennale-en-ligne", "/guides/obligation-decennale"],
    }
  }

  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "Tu es un expert SEO/GEO assurance construction. Réponds en JSON strict.",
      },
      {
        role: "user",
        content: `Chemin: ${path}
Titre actuel: ${title}
Extrait: ${body.slice(0, 1800)}

Retourne JSON:
{
  "title": "...",
  "h1": "...",
  "metaDescription": "...",
  "faq": [{"question":"...","answer":"..."}],
  "internalLinks": ["/devis", "/guides/obligation-decennale"]
}`,
      },
    ],
  })

  const payload = response.choices[0]?.message?.content?.trim() ?? ""
  try {
    return JSON.parse(payload) as SeoRecommendation
  } catch {
    return {
      title: `${title || "Assurance décennale"} | Optimum Assurance`,
      h1: title || "Optimisation SEO",
      metaDescription:
        "Contenu optimisé SEO/GEO pour renforcer la visibilité et la conversion vers le devis assurance décennale.",
      faq: [],
      internalLinks: ["/devis"],
    }
  }
}

async function applyRecommendationToGeneratedContent(
  path: string,
  recommendation: SeoRecommendation,
  options: { autoPublishGenerated: boolean }
) {
  const sb = getSupabaseAdminClient()
  const { data: generated, error: generatedError } = await sb
    .from("generated_content")
    .select("id,status")
    .eq("path", path)
    .maybeSingle()

  if (generatedError) throw generatedError
  if (!generated?.id) {
    return { applied: false as const, generatedId: null, generatedStatus: null }
  }

  const nextStatus =
    options.autoPublishGenerated || generated.status === "published" ? "published" : "approved"

  const { error: updateError } = await sb
    .from("generated_content")
    .update({
      seo_title: recommendation.title ?? undefined,
      h1: recommendation.h1 ?? undefined,
      meta_description: recommendation.metaDescription ?? undefined,
      faq_json: recommendation.faq ?? undefined,
      internal_links: recommendation.internalLinks ?? undefined,
      status: nextStatus,
    })
    .eq("path", path)

  if (updateError) throw updateError

  await sb.from("content_history").insert({
    generated_content_id: generated.id,
    change_type: nextStatus === "published" ? "published" : "approved",
    old_payload: {},
    new_payload: { path, recommendation },
    actor: "seo-optimizer-auto",
  })

  return { applied: true as const, generatedId: generated.id, generatedStatus: nextStatus }
}

export async function scanAndScoreSeoPages(options?: SeoScanOptions) {
  const sb = getSupabaseAdminClient()
  const autoApply = options?.autoApply ?? false
  const autoPublishGenerated = options?.autoPublishGenerated ?? autoApply
  const staticEntries = buildStaticSitemapEntries().map((entry) => new URL(entry.url).pathname)
  const { data: generated } = await sb.from("generated_content").select("path").limit(200)
  const allPaths = [...new Set([...staticEntries, ...(generated ?? []).map((item) => item.path).filter(Boolean)])]

  let scanned = 0
  let weakCount = 0
  const hashToPath = new Map<string, string>()
  let duplicateCount = 0
  let autoAppliedCount = 0
  let autoApprovedCount = 0

  for (const path of allPaths) {
    try {
      const response = await fetch(`${SITE_URL}${path}`, { next: { revalidate: 0 } })
      if (!response.ok) continue
      const html = await response.text()
      const parsed = parsePageSignals(html)
      const bodyHash = createHash("sha256").update(parsed.plainText.slice(0, 10_000)).digest("hex")
      const weak = parsed.wordCount < 320
      if (weak) weakCount++

      if (hashToPath.has(bodyHash)) {
        duplicateCount++
      } else {
        hashToPath.set(bodyHash, path)
      }

      const recommendation = await buildRecommendation(path, parsed.title, parsed.plainText)
      const seoScore = Math.max(
        0,
        Math.min(
          100,
          (parsed.title ? 20 : 0) +
            (parsed.h1 ? 20 : 0) +
            (parsed.hasSchema ? 20 : 0) +
            (parsed.hasFaqSchema ? 20 : 0) +
            Math.min(20, Math.floor(parsed.wordCount / 25))
        )
      )

      let seoPageStatus: "needs_review" | "approved" | "applied" = "needs_review"
      if (autoApply) {
        const applied = await applyRecommendationToGeneratedContent(path, recommendation, {
          autoPublishGenerated,
        })
        if (applied.applied) {
          seoPageStatus = "applied"
          autoAppliedCount++
        } else {
          seoPageStatus = "approved"
          autoApprovedCount++
        }
      }

      await sb.from("seo_pages").upsert(
        {
          path,
          title: parsed.title,
          h1: parsed.h1,
          word_count: parsed.wordCount,
          has_faq: parsed.hasFaqSchema,
          has_schema: parsed.hasSchema,
          body_hash: bodyHash,
          duplicate_of: hashToPath.get(bodyHash) === path ? null : hashToPath.get(bodyHash),
          recommendation_json: recommendation,
          status: seoPageStatus,
          scanned_at: new Date().toISOString(),
        },
        { onConflict: "path" }
      )

      await sb.from("seo_scores").insert({
        path,
        score: seoScore,
        details: {
          hasTitle: Boolean(parsed.title),
          hasH1: Boolean(parsed.h1),
          hasSchema: parsed.hasSchema,
          hasFaqSchema: parsed.hasFaqSchema,
          wordCount: parsed.wordCount,
        },
        measured_at: new Date().toISOString(),
      })

      scanned++
    } catch (error) {
      console.error("[OGI] scanAndScoreSeoPages path:", path, error)
    }
  }

  await logAiReport({
    reportType: "seo_optimizer_scan",
    status: "success",
    title: "Scan SEO terminé",
    summary: `${scanned} pages scannées, ${weakCount} pages faibles, ${duplicateCount} doublons potentiels, ${autoAppliedCount} appliquées automatiquement`,
    payload: { scanned, weakCount, duplicateCount, autoAppliedCount, autoApprovedCount, autoApply },
  })

  return { scanned, weakCount, duplicateCount, autoAppliedCount, autoApprovedCount }
}

export async function validateSeoRecommendation(path: string, approve: boolean) {
  const sb = getSupabaseAdminClient()
  const { data: page, error } = await sb
    .from("seo_pages")
    .select("path,recommendation_json,status")
    .eq("path", path)
    .maybeSingle()

  if (error) throw error
  if (!page) return { updated: false }

  const nextStatus = approve ? "approved" : "rejected"
  const { error: updateError } = await sb.from("seo_pages").update({ status: nextStatus }).eq("path", path)
  if (updateError) throw updateError

  if (approve) {
    const recommendation = page.recommendation_json as Partial<SeoRecommendation> | null
    if (recommendation && Object.keys(recommendation).length > 0) {
      const { data: generated } = await sb
        .from("generated_content")
        .select("id")
        .eq("path", path)
        .maybeSingle()

      await sb
        .from("generated_content")
        .update({
          seo_title: recommendation.title ?? undefined,
          h1: recommendation.h1 ?? undefined,
          meta_description: recommendation.metaDescription ?? undefined,
          faq_json: recommendation.faq ?? undefined,
          internal_links: recommendation.internalLinks ?? undefined,
          status: "approved",
        })
        .eq("path", path)

      if (generated?.id) {
        await sb.from("content_history").insert({
          generated_content_id: generated.id,
          change_type: "approved",
          old_payload: {},
          new_payload: { path, recommendation },
          actor: "seo-optimizer",
        })
      }
      await sb.from("seo_pages").update({ status: "applied" }).eq("path", path)
    }
  }

  await logAiReport({
    reportType: "seo_optimizer_validation",
    status: "success",
    title: `Recommandation SEO ${nextStatus}`,
    summary: `${path} → ${nextStatus}`,
    payload: { path, recommendation: page.recommendation_json },
  })

  return { updated: true, status: nextStatus }
}
