import { NextResponse } from "next/server"
import { buildSitemapEntries, minimalSitemapEntries, type SitemapEntry } from "@/lib/sitemap/build-sitemap-entries"

export const runtime = "nodejs"

/** Cache CDN / réduit charge (route handler). */
export const revalidate = 86_400

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function entryToXml(e: SitemapEntry): string {
  const lastmod = e.lastModified.toISOString().split("T")[0]
  const cf = e.changeFrequency ? `\n    <changefreq>${e.changeFrequency}</changefreq>` : ""
  const pr =
    e.priority != null && Number.isFinite(e.priority) ? `\n    <priority>${e.priority}</priority>` : ""
  return `  <url>
    <loc>${escapeXml(e.url)}</loc>
    <lastmod>${lastmod}</lastmod>${cf}${pr}
  </url>`
}

function renderXml(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entryToXml).join("\n")}
</urlset>`
}

/**
 * Génération XML explicite : évite les 500 du générateur Metadata sitemap Next (gros tableaux / ISR).
 * En cas d’erreur, renvoie toujours 200 + sitemap minimal pour ne pas casser la GSC.
 */
export async function GET() {
  try {
    const entries = await buildSitemapEntries()
    const xml = renderXml(entries)
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    })
  } catch (e) {
    console.error("[sitemap.xml] GET:", e)
    const xml = renderXml(minimalSitemapEntries())
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    })
  }
}
