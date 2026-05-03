export type SitemapEntry = {
  url: string
  lastModified: Date
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: number
}

export type SitemapIndexEntry = {
  url: string
  lastModified?: Date
}

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

function indexEntryToXml(e: SitemapIndexEntry): string {
  const lastmod = e.lastModified ? `\n    <lastmod>${e.lastModified.toISOString().split("T")[0]}</lastmod>` : ""
  return `  <sitemap>
    <loc>${escapeXml(e.url)}</loc>${lastmod}
  </sitemap>`
}

export function renderUrlset(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entryToXml).join("\n")}
</urlset>`
}

export function renderSitemapIndex(entries: SitemapIndexEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(indexEntryToXml).join("\n")}
</sitemapindex>`
}
