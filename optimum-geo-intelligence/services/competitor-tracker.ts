import { createHash } from "node:crypto"
import type FirecrawlApp from "firecrawl"
import type { OgiCompetitorPageExtract } from "@/optimum-geo-intelligence/types"
import { OGI_SCAN_MAX_PAGES } from "@/optimum-geo-intelligence/lib/constants"
import { extractUniqueMatches, normalizeWhitespace } from "@/optimum-geo-intelligence/lib/utils"
import { logAiReport, logCrawlRun } from "@/optimum-geo-intelligence/services/audit-log"
import { getSupabaseAdminClient } from "@/optimum-geo-intelligence/services/supabase-admin"

function scoreSeoExtract(extract: OgiCompetitorPageExtract): number {
  let score = 0
  if (extract.title.length >= 30 && extract.title.length <= 65) score += 20
  if (extract.metaDescription.length >= 120 && extract.metaDescription.length <= 170) score += 15
  if (extract.h1.length >= 10) score += 15
  score += Math.min(20, extract.h2.length * 4)
  if (extract.faq.length >= 3) score += 15
  if (extract.schemas.length > 0) score += 15
  return Math.min(100, score)
}

function extractSeoFromHtml(html: string): OgiCompetitorPageExtract {
  const normalized = normalizeWhitespace(html)
  const title = normalizeWhitespace(/<title[^>]*>(.*?)<\/title>/i.exec(html)?.[1] ?? "")
  const metaDescription = normalizeWhitespace(
    /<meta[^>]+name=["']description["'][^>]+content=["'](.*?)["']/i.exec(html)?.[1] ?? ""
  )
  const h1 = normalizeWhitespace(/<h1[^>]*>(.*?)<\/h1>/i.exec(html)?.[1] ?? "")
  const h2 = extractUniqueMatches(html, /<h2[^>]*>(.*?)<\/h2>/gi)
  const faqQuestions = extractUniqueMatches(html, /<h3[^>]*>(.*?)<\/h3>/gi).filter((item) => /\?$/.test(item))
  const schemas = extractUniqueMatches(
    html,
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  const extract: OgiCompetitorPageExtract = {
    title,
    metaDescription,
    h1,
    h2,
    faq: faqQuestions.slice(0, 12),
    schemas,
    bodyText: normalized.slice(0, 12_000),
    seoScore: 0,
  }
  extract.seoScore = scoreSeoExtract(extract)
  return extract
}

async function extractFromPlaywright(url: string): Promise<OgiCompetitorPageExtract | null> {
  try {
    const mod = await import("@playwright/test")
    const browser = await mod.chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: "networkidle", timeout: 25_000 })
    const html = await page.content()
    await browser.close()
    return extractSeoFromHtml(html)
  } catch (error) {
    console.error("[OGI] extractFromPlaywright:", error)
    return null
  }
}

async function extractFromFirecrawl(url: string): Promise<OgiCompetitorPageExtract | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim()
  if (!apiKey) return null
  try {
    const firecrawlModule = (await import("firecrawl")) as { default: typeof FirecrawlApp }
    const app = new firecrawlModule.default({ apiKey })
    const scrape = await app.scrapeUrl(url, {
      formats: ["html", "markdown"],
      onlyMainContent: false,
    })
    const html = typeof scrape.html === "string" ? scrape.html : ""
    const markdown = typeof scrape.markdown === "string" ? scrape.markdown : ""
    if (!html && !markdown) return null
    return extractSeoFromHtml(html || markdown)
  } catch (error) {
    console.error("[OGI] extractFromFirecrawl:", error)
    return null
  }
}

async function extractWithFallback(url: string): Promise<OgiCompetitorPageExtract | null> {
  const fromFirecrawl = await extractFromFirecrawl(url)
  if (fromFirecrawl) return fromFirecrawl

  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Optimum-GEO-Intelligence/1.0 (+https://optimum-assurance.fr)" },
      next: { revalidate: 0 },
    })
    if (response.ok) {
      const html = await response.text()
      return extractSeoFromHtml(html)
    }
  } catch (error) {
    console.error("[OGI] fetch fallback:", error)
  }
  return extractFromPlaywright(url)
}

async function discoverUrls(domain: string, limit: number): Promise<string[]> {
  const base = domain.startsWith("http") ? domain : `https://${domain}`
  const sitemapCandidates = [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`]
  const out = new Set<string>([base])

  for (const sitemapUrl of sitemapCandidates) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: { "user-agent": "Optimum-GEO-Intelligence/1.0 (+https://optimum-assurance.fr)" },
        next: { revalidate: 0 },
      })
      if (!response.ok) continue
      const xml = await response.text()
      const matches = xml.matchAll(/<loc>(.*?)<\/loc>/gi)
      for (const match of matches) {
        const url = match[1]?.trim()
        if (!url) continue
        out.add(url)
        if (out.size >= limit) break
      }
      if (out.size >= limit) break
    } catch (error) {
      console.warn("[OGI] discoverUrls sitemap:", error)
    }
  }

  return [...out].slice(0, limit)
}

export async function runCompetitorTracker(options?: {
  competitorId?: string
  domain?: string
  limit?: number
}) {
  const sb = getSupabaseAdminClient()
  const scanLimit = Math.min(OGI_SCAN_MAX_PAGES, Math.max(1, options?.limit ?? 20))

  const competitorsQuery = sb
    .from("competitors")
    .select("id,name,domain,is_active")
    .eq("is_active", true)

  const { data: competitors, error: competitorsError } = options?.competitorId
    ? await competitorsQuery.eq("id", options.competitorId).limit(1)
    : options?.domain
      ? await competitorsQuery.eq("domain", options.domain).limit(1)
      : await competitorsQuery

  if (competitorsError) throw competitorsError
  if (!competitors?.length) return { scanned: 0, changed: 0, created: 0 }

  let scanned = 0
  let changed = 0
  let created = 0

  for (const competitor of competitors) {
    const urls = await discoverUrls(competitor.domain, scanLimit)

    for (const url of urls) {
      scanned++
      const extracted = await extractWithFallback(url)
      if (!extracted) {
        await logCrawlRun({
          source: "competitor-tracker",
          target: url,
          status: "warning",
          message: "Extraction vide",
          payload: { competitorId: competitor.id, competitor: competitor.name },
        })
        continue
      }

      const bodyHash = createHash("sha256").update(extracted.bodyText).digest("hex")
      const { data: latest } = await sb
        .from("competitor_pages")
        .select("id,body_hash,title,meta_description,h1,h2,faq,schema_json")
        .eq("competitor_id", competitor.id)
        .eq("url", url)
        .order("crawled_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const isNew = !latest
      const hasChanged = !latest || latest.body_hash !== bodyHash
      const changedFields: string[] = []
      if (!latest) {
        changedFields.push("new_page")
      } else {
        if (latest.title !== extracted.title) changedFields.push("title")
        if (latest.meta_description !== extracted.metaDescription) changedFields.push("meta_description")
        if (latest.h1 !== extracted.h1) changedFields.push("h1")
        if (JSON.stringify(latest.h2 ?? []) !== JSON.stringify(extracted.h2)) changedFields.push("h2")
      }

      if (isNew) created++
      if (hasChanged) changed++

      const { error: insertError } = await sb.from("competitor_pages").insert({
        competitor_id: competitor.id,
        url,
        title: extracted.title,
        meta_description: extracted.metaDescription,
        h1: extracted.h1,
        h2: extracted.h2,
        faq: extracted.faq,
        schema_json: extracted.schemas,
        body_hash: bodyHash,
        seo_score: extracted.seoScore,
        is_new: isNew,
        changed_fields: changedFields,
        crawled_at: new Date().toISOString(),
      })

      if (insertError) {
        await logCrawlRun({
          source: "competitor-tracker",
          target: url,
          status: "error",
          message: insertError.message,
          payload: { competitorId: competitor.id },
        })
      } else {
        await logCrawlRun({
          source: "competitor-tracker",
          target: url,
          status: hasChanged ? "success" : "warning",
          message: hasChanged ? "Page analysée et snapshot stocké" : "Aucun changement détecté",
          payload: { competitorId: competitor.id, seoScore: extracted.seoScore },
        })
      }
    }
  }

  await logAiReport({
    reportType: "competitor_scan",
    status: "success",
    title: "Veille concurrentielle terminée",
    summary: `${scanned} pages analysées, ${created} nouvelles, ${changed} modifiées`,
    payload: { scanned, changed, created },
  })

  return { scanned, changed, created }
}
