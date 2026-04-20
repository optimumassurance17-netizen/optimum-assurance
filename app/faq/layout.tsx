import type { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { faqs } from "@/lib/faq-data"
import { seoFaqPageNode, seoJsonLdGraph, seoBreadcrumbListNode, seoWebPageNode } from "@/lib/seo-jsonld-helpers"
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "FAQ assurance décennale & dommage ouvrage",
  description: truncateForDescription(
    "Obligation décennale, prix et cotisation, attestation, résiliation, sinistre, parcours de souscription et dommage ouvrage : réponses pour artisans et maîtres d’ouvrage. Optimum Assurance.",
    158
  ),
  alternates: { canonical: `${baseUrl}/faq` },
  openGraph: {
    url: `${baseUrl}/faq`,
    title: "FAQ assurance décennale & dommage ouvrage | Optimum Assurance",
    description:
      "Tarif, attestation, Spinetta, DO, souscription en ligne : questions fréquentes et liens vers devis et guides.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ assurance décennale & dommage ouvrage | Optimum Assurance",
    description:
      "Tarif, attestation, résiliation, sinistre, DO : réponses pour pros BTP et particuliers.",
    images: [`${baseUrl}/opengraph-image`],
  },
}

const faqPageJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "FAQ", path: "/faq" },
  ]),
  seoWebPageNode({
    path: "/faq",
    name: "Questions fréquentes — assurance décennale et dommage ouvrage",
    description:
      "Réponses sur l'assurance décennale BTP, le dommage ouvrage, les parcours de souscription et le paiement.",
  }),
  seoFaqPageNode([...faqs]),
])

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd id="jsonld-faq" data={faqPageJsonLd} />
      {children}
    </>
  )
}
