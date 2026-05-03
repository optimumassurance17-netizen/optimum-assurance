import { METIERS_SEO } from "@/lib/metiers-seo"
import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import { GUIDES_SEO } from "@/lib/guides-seo"
import { SITE_URL } from "@/lib/site-url"
import type { SitemapEntry } from "@/lib/sitemap/xml"

const baseUrl = SITE_URL

/**
 * Construit la liste statique des URLs SEO.
 * Le programmatique géolocalisé est servi dans /sitemap-programmatic.xml pour éviter un sitemap unique lourd.
 */
export function buildStaticSitemapEntries(): SitemapEntry[] {
  const metiers: SitemapEntry[] = METIERS_SEO.map((m) => ({
    url: `${baseUrl}/assurance-decennale/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const doPages: SitemapEntry[] = DO_SEO.map((m) => ({
    url: `${baseUrl}/dommage-ouvrage/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const guides: SitemapEntry[] = GUIDES_SEO.map((g) => ({
    url: `${baseUrl}/guides/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    { url: `${baseUrl}/assurance-decennale`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.92 },
    { url: `${baseUrl}/dommage-ouvrage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.88 },
    {
      url: `${baseUrl}/devis-assurance-decennale-en-ligne`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },
    { url: `${baseUrl}/devis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/devis-dommage-ouvrage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/devis-rc-fabriquant`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/devis/rcpro`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.65 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.82 },
    ...guides,
    { url: `${baseUrl}/avis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...metiers,
    ...doPages,
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/cgv`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    {
      url: `${baseUrl}/conditions-generales-dommage-ouvrage`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.45,
    },
    { url: `${baseUrl}/conditions-attestations`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.35 },
    { url: `${baseUrl}/mentions-legales`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/confidentialite`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/etude`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/etude/domaine`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.45 },
    { url: `${baseUrl}/droits-personnes`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.25 },
  ]
}

/** Compat ancien import. */
export async function buildSitemapEntries(): Promise<SitemapEntry[]> {
  return buildStaticSitemapEntries()
}

export function minimalSitemapEntries(): SitemapEntry[] {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
