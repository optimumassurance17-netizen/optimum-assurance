import type { Metadata } from "next"
import { faqs } from "@/lib/faq-data"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "FAQ Assurance Décennale BTP — Prix, Attestation, Obligation",
  description:
    "Questions fréquentes assurance décennale : obligation loi Spinetta, prix, attestation immédiate, sociétés résiliées, garanties, paiement SEPA, résiliation, déclaration sinistre.",
  keywords: ["FAQ assurance décennale", "obligation décennale", "prix assurance décennale", "attestation décennale", "résiliation décennale"],
  alternates: {
    canonical: `${baseUrl}/faq`,
  },
  openGraph: {
    url: `${baseUrl}/faq`,
    title: "FAQ Assurance Décennale BTP | Optimum Assurance",
    description: "Réponses sur l'obligation, le prix, l'attestation et la souscription décennale.",
  },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.r,
    },
  })),
}

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  )
}
