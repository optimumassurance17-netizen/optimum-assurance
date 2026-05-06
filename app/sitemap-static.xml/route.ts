import { NextResponse } from "next/server"
import { buildStaticSitemapEntries } from "@/lib/sitemap/build-sitemap-entries"
import { renderUrlset } from "@/lib/sitemap/xml"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const xml = renderUrlset(buildStaticSitemapEntries())
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  })
}
