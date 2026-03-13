import { MetadataRoute } from "next"
import { METIERS_SEO } from "@/lib/metiers-seo"
import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import { GUIDES_SEO } from "@/lib/guides-seo"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export default function sitemap(): MetadataRoute.Sitemap {
  const metiers = METIERS_SEO.map((m) => ({
    url: `${baseUrl}/assurance-decennale/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const doPages = DO_SEO.map((m) => ({
    url: `${baseUrl}/dommage-ouvrage/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const guides = GUIDES_SEO.map((g) => ({
    url: `${baseUrl}/guides/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/devis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/devis-dommage-ouvrage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.82 },
    ...guides,
    { url: `${baseUrl}/avis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...metiers,
    ...doPages,
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/cgv`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/mentions-legales`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/confidentialite`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/connexion`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/etude`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/creer-compte`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.35 },
  ]
}
