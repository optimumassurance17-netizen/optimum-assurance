import { NextResponse } from "next/server"
import { SITE_URL } from "@/lib/site-url"
import { renderSitemapIndex } from "@/lib/sitemap/xml"

export const runtime = "nodejs"

/**
 * Toujours régénérer à la requête : évite une page statique / cache CDN obsolète
 * avec ancien code (ex. 500) après déploiement.
 */
export const dynamic = "force-dynamic"

const SITEMAPS = ["sitemap-static.xml", "sitemap-programmatic.xml"] as const

/**
 * Index de sitemaps léger : évite un sitemap unique lourd/fragile pour le SEO programmatique géolocalisé.
 */
export async function GET() {
  const xml = renderSitemapIndex(
    SITEMAPS.map((path) => ({
      url: `${SITE_URL}/${path}`,
      lastModified: new Date(),
    }))
  )
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  })
}
