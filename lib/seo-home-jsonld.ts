import { EQ_MENSUEL_MIN } from "@/lib/decennale-affichage-tarif"
import { seoOrgId, seoWebsiteId } from "@/lib/seo-jsonld-helpers"
import { SITE_URL as baseUrl } from "@/lib/site-url"

const publicContactEmail =
  process.env.NEXT_PUBLIC_EMAIL?.trim() || "contact@optimum-assurance.fr"

/** Profils sociaux (optionnel) — ex. NEXT_PUBLIC_SEO_SAME_AS="https://linkedin.com/...,https://..." */
function sameAsFromEnv(): string[] | undefined {
  const raw = process.env.NEXT_PUBLIC_SEO_SAME_AS?.trim()
  if (!raw) return undefined
  const list = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"))
  return list.length ? list : undefined
}

/** Un seul script JSON-LD @graph — évite les SearchAction invalides sans moteur de recherche interne. */
export function buildHomePageJsonLdGraph() {
  const sameAs = sameAsFromEnv()

  const organization = {
    "@type": "InsuranceAgency",
    "@id": seoOrgId,
    name: "Optimum Assurance",
    description: `Assurance décennale BTP et dommage ouvrage en ligne. Devis en quelques minutes, attestation pour artisans et entreprises. Plombier, électricien, peintre, maçon… Dès ${EQ_MENSUEL_MIN} €/mois équivalent (min. 600 €/an), prélèvement trimestriel.`,
    url: baseUrl,
    logo: `${baseUrl}/icon-512.png`,
    image: `${baseUrl}/opengraph-image`,
    areaServed: { "@type": "Country", name: "FR" },
    priceRange: "€€",
    inLanguage: "fr-FR",
    serviceType: ["Assurance décennale professionnelle", "Assurance dommage ouvrage"],
    knowsAbout: [
      "Assurance décennale",
      "Assurance dommage ouvrage",
      "Bâtiment et travaux publics",
      "Loi Spinetta",
    ],
    email: publicContactEmail,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: publicContactEmail,
        areaServed: "FR",
        availableLanguage: ["French"],
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      bestRating: "5",
      ratingCount: "50",
      worstRating: "1",
    },
    ...(sameAs?.length ? { sameAs } : {}),
  }

  const website = {
    "@type": "WebSite",
    "@id": seoWebsiteId,
    name: "Optimum Assurance",
    url: baseUrl,
    inLanguage: "fr-FR",
    publisher: { "@id": seoOrgId },
    /** Pas de SearchAction : pas de recherche interne — évite les erreurs d’interprétation Google. */
  }

  const serviceRoutes: { name: string; path: string }[] = [
    { name: "Devis assurance décennale BTP", path: "/devis" },
    { name: "Activités assurance décennale", path: "/assurance-decennale" },
    { name: "Devis assurance dommage ouvrage", path: "/devis-dommage-ouvrage" },
    { name: "Profils dommage ouvrage", path: "/dommage-ouvrage" },
    { name: "Souscription dommage ouvrage en ligne", path: "/souscription-dommage-ouvrage" },
    { name: "FAQ assurance décennale et dommage ouvrage", path: "/faq" },
    { name: "Guides assurance construction", path: "/guides" },
    { name: "Assurance décennale plomberie sanitaire", path: "/assurance-decennale/plomberie-sanitaire" },
    { name: "Dommage ouvrage auto-construction", path: "/dommage-ouvrage/auto-construction" },
    { name: "Avis clients Optimum Assurance", path: "/avis" },
  ]

  const itemList = {
    "@type": "ItemList",
    "@id": `${baseUrl}/#principal-pages`,
    name: "Pages clés Optimum Assurance",
    numberOfItems: serviceRoutes.length,
    itemListElement: serviceRoutes.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.name,
      url: `${baseUrl}${r.path}`,
    })),
  }

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website, itemList],
  }
}
