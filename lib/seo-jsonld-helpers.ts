/**
 * Helpers JSON-LD réutilisables — composition en @graph pour éviter les scripts dupliqués.
 */

import { SITE_URL as seoBaseUrl } from "@/lib/site-url"

export { seoBaseUrl }

export const seoOrgId = `${seoBaseUrl}/#organization`
export const seoWebsiteId = `${seoBaseUrl}/#website`

export function seoAbsoluteUrl(path: string): string {
  if (path.startsWith("http")) return path
  return `${seoBaseUrl}${path.startsWith("/") ? path : `/${path}`}`
}

/** Nœud BreadcrumbList (sans @context — pour inclusion dans @graph). */
export function seoBreadcrumbListNode(
  items: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: seoAbsoluteUrl(it.path),
    })),
  }
}

/** Nœud FAQPage. */
export function seoFaqPageNode(entries: readonly { q: string; r: string }[]): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: entries.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.r },
    })),
  }
}

/** Nœud WebPage lié au site. */
export function seoWebPageNode(opts: {
  path: string
  name: string
  description?: string
  breadcrumb?: Record<string, unknown>
}): Record<string, unknown> {
  const url = seoAbsoluteUrl(opts.path)
  return {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    inLanguage: "fr-FR",
    isPartOf: { "@id": seoWebsiteId },
    publisher: { "@id": seoOrgId },
    ...(opts.breadcrumb ? { breadcrumb: opts.breadcrumb } : {}),
  }
}

export function seoJsonLdGraph(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  }
}
