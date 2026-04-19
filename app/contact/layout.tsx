import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Contact assurance décennale, dommage ouvrage et sinistre | Optimum Assurance",
  description: truncateForDescription(
    "Contact Optimum Assurance : question sur devis décennale, dommage ouvrage, attestation, sinistre ou dossier en cours. Réponse sous 24 h via formulaire et assistant.",
    158
  ),
  alternates: { canonical: `${baseUrl}/contact` },
  openGraph: {
    url: `${baseUrl}/contact`,
    title: "Contact décennale, dommage ouvrage et sinistre | Optimum Assurance",
    description:
      "Besoin d'aide sur un devis, une attestation, un sinistre ou un dossier en cours ? Réponse sous 24 h.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact décennale, dommage ouvrage et sinistre | Optimum Assurance",
    description:
      "Question sur devis, attestation, sinistre ou dossier en cours : réponse sous 24 h.",
    images: [`${baseUrl}/opengraph-image`],
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
