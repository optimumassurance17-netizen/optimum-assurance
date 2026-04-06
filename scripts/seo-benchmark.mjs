#!/usr/bin/env node
/**
 * Grille SEO reproductible : HTTP, taille HTML, signaux JSON-LD (FAQPage, etc.),
 * longueur meta title/description, approximation du volume texte visible.
 * Usage : node scripts/seo-benchmark.mjs
 */

const URLS = [
  { id: "optimum", label: "Optimum (prod)", url: "https://www.optimum-assurance.fr/" },
  { id: "optimum-faq", label: "Optimum FAQ", url: "https://www.optimum-assurance.fr/faq" },
  { id: "c1", label: "Comparateur décennale (WP)", url: "https://comparateurdecennale.fr/" },
  { id: "c2", label: "Décennalement (blog WP)", url: "https://www.decennalement.fr/assurance-decennale" },
  { id: "c3", label: "Assurances-décennale (comparateur)", url: "https://www.assurances-decennale.fr/comparateur/" },
]

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
}

function wordCount(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i")
  const m = html.match(re)
  if (m) return m[1]
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i")
  return html.match(re2)?.[1] ?? null
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return m ? m[1].trim().replace(/\s+/g, " ") : null
}

function extractJsonLdBlocks(html) {
  const blocks = []
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    try {
      blocks.push(JSON.parse(raw))
    } catch {
      try {
        blocks.push(JSON.parse(raw.replace(/^\uFEFF/, "")))
      } catch {
        /* ex. JSON tronqué ou caractères invalides — fallback HTML ci-dessous */
      }
    }
  }
  return blocks
}

/** Détection des @types courants même si le parse JSON-LD échoue (Next RSC, échappements). */
function typesFromHtmlSnippets(html) {
  const types = []
  const checks = [
    ["FAQPage", /"@type"\s*:\s*"FAQPage"/],
    ["InsuranceAgency", /"@type"\s*:\s*"InsuranceAgency"/],
    ["WebSite", /"@type"\s*:\s*"WebSite"/],
    ["BreadcrumbList", /"@type"\s*:\s*"BreadcrumbList"/],
    ["Organization", /"@type"\s*:\s*"Organization"/],
    ["Product", /"@type"\s*:\s*"Product"/],
  ]
  for (const [name, re] of checks) {
    if (re.test(html)) types.push(name)
  }
  /* Next.js App Router : chaîne présente dans le HTML RSC même sans <script type="application/ld+json"> classique. */
  if (/InsuranceAgency/.test(html) && !types.some((t) => t.includes("InsuranceAgency")))
    types.push("InsuranceAgency (détecté dans HTML)")
  if (/ItemList/.test(html) && !types.includes("ItemList")) types.push("ItemList (détecté dans HTML)")
  if (/FAQPage/.test(html) && !types.some((t) => t.includes("FAQPage"))) types.push("FAQPage (détecté dans HTML)")
  return [...new Set(types)]
}

function flattenGraph(obj, out = []) {
  if (obj == null) return out
  if (Array.isArray(obj)) {
    obj.forEach((x) => flattenGraph(x, out))
    return out
  }
  if (typeof obj === "object") {
    if (obj["@graph"]) flattenGraph(obj["@graph"], out)
    out.push(obj)
    Object.values(obj).forEach((v) => {
      if (v && typeof v === "object" && !Array.isArray(v) && v["@type"]) flattenGraph(v, out)
    })
  }
  return out
}

function collectTypes(blocks) {
  const types = new Set()
  for (const b of blocks) {
    flattenGraph(b).forEach((node) => {
      const t = node["@type"]
      if (Array.isArray(t)) t.forEach((x) => types.add(String(x)))
      else if (t) types.add(String(t))
    })
  }
  return [...types].sort()
}

async function analyze(entry) {
  const res = await fetch(entry.url, {
    redirect: "follow",
    headers: { "User-Agent": "OptimumSEO-Benchmark/1.0 (+https://www.optimum-assurance.fr)" },
  })
  const html = await res.text()
  const text = stripTags(html)
  const ld = extractJsonLdBlocks(html)
  const typesFromLd = collectTypes(ld)
  const typesFromHtml = typesFromHtmlSnippets(html)
  const types = [...new Set([...typesFromLd, ...typesFromHtml])].sort()

  return {
    id: entry.id,
    label: entry.label,
    finalUrl: res.url,
    status: res.status,
    htmlBytes: Buffer.byteLength(html, "utf8"),
    titleLen: extractTitle(html)?.length ?? 0,
    title: extractTitle(html),
    metaDescLen: extractMeta(html, "description")?.length ?? 0,
    metaDescription: extractMeta(html, "description"),
    textWordsApprox: wordCount(text),
    jsonLdTypes: types,
    hasFaqPage: types.some((t) => t.includes("FAQPage")),
    hasOrg: types.some((t) => /Organization|InsuranceAgency|LocalBusiness|Corporation/i.test(t)),
    hasBreadcrumb: types.some((t) => t.includes("BreadcrumbList")),
    hasWebSite: types.some((t) => t.includes("WebSite")),
    jsonLdParseOk: ld.length > 0,
    /** Google affiche souvent ~150–160 caractères ; au-delà, risque de troncature dans la SERP. */
    metaDescriptionLong: (extractMeta(html, "description")?.length ?? 0) > 165,
  }
}

async function main() {
  const rows = []
  for (const u of URLS) {
    try {
      rows.push(await analyze(u))
    } catch (e) {
      rows.push({
        id: u.id,
        label: u.label,
        error: String(e?.message ?? e),
      })
    }
  }

  console.log(JSON.stringify(rows, null, 2))
}

main()
