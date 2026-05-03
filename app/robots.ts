import { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site-url"

/**
 * Une seule URL de sitemap = l’URL canonique du site (SITE_URL).
 * Ne pas ajouter le domaine nu en parallèle du www : souvent il ne pointe pas vers Vercel
 * et renvoie une page HTML (parking, hébergeur, autre stack) → erreur GSC « sitemap en HTML ».
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL
  const host = new URL(baseUrl).host
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    host,
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
