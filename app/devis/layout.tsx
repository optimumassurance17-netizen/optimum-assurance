import type { Metadata } from "next"
import { EQ_MENSUEL_MIN } from "@/lib/decennale-affichage-tarif"
import { faqDevis } from "@/lib/garanties-data"
import {
  seoBreadcrumbListNode,
  seoFaqPageNode,
  seoJsonLdGraph,
  seoWebPageNode,
} from "@/lib/seo-jsonld-helpers"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "Devis assurance décennale BTP en ligne — tarif immédiat",
  description: `Simulateur décennale : tarif selon votre CA et vos activités. Dès ${EQ_MENSUEL_MIN} €/mois (équivalent), prélèvement trimestriel. Sans engagement.`,
  alternates: { canonical: `${baseUrl}/devis` },
  openGraph: {
    url: `${baseUrl}/devis`,
    title: "Devis assurance décennale BTP | Optimum Assurance",
    description: `Tarif en quelques minutes. Dès ${EQ_MENSUEL_MIN} €/mois équivalent.`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(devisJsonLd) }} />
      {children}
    </>
  )
}
