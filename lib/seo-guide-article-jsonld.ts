import {
  seoAbsoluteUrl,
  seoBaseUrl,
  seoJsonLdGraph,
  seoOrgId,
  seoWebsiteId,
} from "@/lib/seo-jsonld-helpers"

/** Date de référence pour les guides (mise à jour manuelle si gros refresh éditorial). */
const GUIDE_DATE_PUBLISHED = "2024-09-01T08:00:00+02:00"
const GUIDE_DATE_MODIFIED = "2025-03-01T08:00:00+02:00"

type GuideMeta = {
  slug: string
  title: string
  description: string
  h1: string
}

export function buildGuideArticleJsonLdGraph(data: GuideMeta) {
  const url = seoAbsoluteUrl(`/guides/${data.slug}`)

  const breadcrumb: Record<string, unknown> = {
    "@id": `${url}#breadcrumb`,
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: seoBaseUrl },
      { "@type": "ListItem", position: 2, name: "Guides", item: seoAbsoluteUrl("/guides") },
      { "@type": "ListItem", position: 3, name: data.title, item: url },
    ],
  }

  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: data.title,
    description: data.description,
    inLanguage: "fr-FR",
    isPartOf: { "@id": seoWebsiteId },
    publisher: { "@id": seoOrgId },
    breadcrumb: { "@id": `${url}#breadcrumb` },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${seoBaseUrl}/opengraph-image`,
    },
  }

  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: data.h1,
    name: data.title,
    description: data.description,
    url,
    inLanguage: "fr-FR",
    articleSection: "Guides assurance construction",
    datePublished: GUIDE_DATE_PUBLISHED,
    dateModified: GUIDE_DATE_MODIFIED,
    author: { "@id": seoOrgId },
    publisher: { "@id": seoOrgId },
    image: `${seoBaseUrl}/opengraph-image`,
    mainEntityOfPage: { "@id": `${url}#webpage` },
    isPartOf: { "@id": seoWebsiteId },
  }

  return seoJsonLdGraph([breadcrumb, webPage, article])
}
