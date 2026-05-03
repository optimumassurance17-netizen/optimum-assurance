import { sitemapIndexResponse } from "@/lib/sitemap/index-response"

export const runtime = "nodejs"

/**
 * Toujours régénérer à la requête : évite une page statique / cache CDN obsolète
 * avec ancien code (ex. 500) après déploiement.
 */
export const dynamic = "force-dynamic"

/**
 * Index de sitemaps léger : évite un sitemap unique lourd/fragile pour le SEO programmatique géolocalisé.
 */
export async function GET() {
  return sitemapIndexResponse()
}
