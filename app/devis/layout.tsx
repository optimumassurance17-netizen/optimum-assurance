import type { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { EQ_MENSUEL_MIN } from "@/lib/decennale-affichage-tarif"
import { faqDevis } from "@/lib/garanties-data"
import {
  seoBreadcrumbListNode,
  seoFaqPageNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Devis assurance décennale BTP gratuit — tarif immédiat en ligne",
  description: `Simulateur assurance décennale : tarif selon votre chiffre d’affaires et vos activités BTP (plombier, électricien, maçon…). Dès ${EQ_MENSUEL_MIN} €/mois équivalent, prélèvement trimestriel. Sans engagement, 100 % en ligne.`,
  alternates: { canonical: `${baseUrl}/devis` },
  openGraph: {
    url: `${baseUrl}/devis`,
    title: "Devis assurance décennale BTP | Optimum Assurance",
    description: `Tarif en quelques minutes. Dès ${EQ_MENSUEL_MIN} €/mois équivalent.`,
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Devis assurance décennale BTP | Optimum Assurance",
    images: [`${baseUrl}/opengraph-image`],
  },
}

const devisJsonLd = seoJsonLdGraph([
  seoBreadcrumbListNode([
    { name: "Accueil", path: "/" },
    { name: "Devis décennale", path: "/devis" },
  ]),
  seoWebPageNode({
    path: "/devis",
    name: "Devis assurance décennale BTP",
    description: `Simulateur en ligne — tarif selon chiffre d'affaires et activités BTP. Dès ${EQ_MENSUEL_MIN} €/mois (équivalent).`,
  }),
  seoFaqPageNode(faqDevis),
])

export default function DevisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd id="jsonld-devis" data={devisJsonLd} />
      {children}
    </>
  )
}
