import { NextResponse } from "next/server"
import { SITE_URL } from "@/lib/site-url"
import { fetchProgrammaticSitemapUrls } from "@/lib/seo-programmatic/queries"
import { renderUrlset } from "@/lib/sitemap/xml"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const programmatic = await fetchProgrammaticSitemapUrls()
    const entries = programmatic.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      lastModified: new Date(),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    }))
    return new NextResponse(renderUrlset(entries), {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    })
  } catch (e) {
    console.error("[sitemap-programmatic.xml] GET:", e)
    return new NextResponse(renderUrlset([]), {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    })
  }
}
