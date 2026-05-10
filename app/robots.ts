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
        // Les pages publiques chargent NextAuth côté client pour connaître la session.
        // Googlebot doit pouvoir récupérer ces endpoints, sinon GSC signale une ressource bloquée.
        allow: ["/", "/api/auth/"],
        disallow: ["/api/"],
      },
    ],
    host,
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/gsc-sitemap.xml`],
  }
}
