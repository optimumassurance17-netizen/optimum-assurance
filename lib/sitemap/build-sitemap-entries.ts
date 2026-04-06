import { METIERS_SEO } from "@/lib/metiers-seo"
import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import { GUIDES_SEO } from "@/lib/guides-seo"
import { fetchProgrammaticSitemapUrls } from "@/lib/seo-programmatic/queries"
import { SITE_URL } from "@/lib/site-url"

export type SitemapEntry = {
  url: string
  lastModified: Date
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: number
}

const baseUrl = SITE_URL

/**
 * Construit la liste des URLs pour sitemap.xml (logique unique : metadata ou route handler).
 */
export async function buildSitemapEntries(): Promise<SitemapEntry[]> {
  let programmatic: Awaited<ReturnType<typeof fetchProgrammaticSitemapUrls>> = []
  try {
    programmatic = await fetchProgrammaticSitemapUrls()
  } catch (e) {
    console.error("[sitemap] fetchProgrammaticSitemapUrls:", e)
  }

  const programmaticEntries: SitemapEntry[] = programmatic.map((p) => ({
    url: `${baseUrl}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))

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
    { url: `${baseUrl}/devis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/devis-dommage-ouvrage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/devis-rc-fabriquant`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    {
      url: `${baseUrl}/souscription-dommage-ouvrage`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.72,
    },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.82 },
    ...guides,
    { url: `${baseUrl}/avis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...metiers,
    ...doPages,
    ...programmaticEntries,
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
    { url: `${baseUrl}/connexion`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/etude`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/etude/domaine`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.45 },
    { url: `${baseUrl}/creer-compte`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.35 },
    { url: `${baseUrl}/droits-personnes`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.25 },
    { url: `${baseUrl}/mandat-sepa`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.25 },
    { url: `${baseUrl}/mot-de-passe-oublie`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ]
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
