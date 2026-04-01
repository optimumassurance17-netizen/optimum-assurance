import { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site-url"

function sitemapEntries(baseUrl: string): string | string[] {
  const primary = `${baseUrl}/sitemap.xml`
  const www = /^https:\/\/www\.([^/]+)$/i.exec(baseUrl)
  if (www) {
    return [primary, `https://${www[1]}/sitemap.xml`]
  }
  return primary
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/espace-client/", "/gestion", "/confirmation", "/paiement", "/souscription", "/signature", "/api/"],
      },
    ],
    host: baseUrl,
    sitemap: sitemapEntries(baseUrl),
  }
}
