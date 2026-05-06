import { NextResponse } from "next/server"
import { SITE_URL } from "@/lib/site-url"
import { renderSitemapIndex } from "@/lib/sitemap/xml"

const SITEMAPS = ["sitemap-static.xml", "sitemap-programmatic.xml"] as const

export function sitemapIndexResponse(): NextResponse {
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
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  })
}
