import type { Metadata } from "next"
import { faqs } from "@/lib/faq-data"
import { seoFaqPageNode, seoJsonLdGraph, seoBreadcrumbListNode, seoWebPageNode } from "@/lib/seo-jsonld-helpers"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "FAQ — assurance décennale, dommage ouvrage, souscription",
  description:
    "Réponses sur la décennale BTP, le dommage ouvrage, les devis, la souscription, le paiement et l'espace client.",
  alternates: { canonical: `${baseUrl}/faq` },
  openGraph: {
    url: `${baseUrl}/faq`,
    title: "FAQ | Optimum Assurance",
    description: "Questions fréquentes sur l'assurance décennale et le dommage ouvrage.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }} />
      {children}
    </>
  )
}
