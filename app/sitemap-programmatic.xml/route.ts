import { NextResponse } from "next/server"
import { SITE_URL } from "@/lib/site-url"
import { fetchProgrammaticSitemapUrls } from "@/lib/seo-programmatic/queries"
import { ensureSitemapEntries, renderUrlset, type SitemapEntry } from "@/lib/sitemap/xml"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function homepageSitemapEntry(): SitemapEntry {
  return {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  }
}

function xmlResponse(entries: SitemapEntry[], cacheControl: string) {
  return new NextResponse(renderUrlset(ensureSitemapEntries(entries, homepageSitemapEntry())), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  })
}

export async function GET() {
  try {
    const programmatic = await fetchProgrammaticSitemapUrls()
    const entries = programmatic.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      lastModified: new Date(),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    }))
    return xmlResponse(entries, "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400")
  } catch (e) {
    console.error("[sitemap-programmatic.xml] GET:", e)
    return xmlResponse([], "public, max-age=300, s-maxage=300")
  }
}
