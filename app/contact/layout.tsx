import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Contact Assurance Décennale | Optimum Assurance",
  description:
    "Contactez Optimum Assurance : questions sur l'assurance décennale BTP, dommage ouvrage, sinistre. Réponse sous 24h. Formulaire et assistant en ligne.",
  alternates: { canonical: `${baseUrl}/contact` },
  openGraph: {
    url: `${baseUrl}/contact`,
    title: "Contact | Optimum Assurance",
    description:
      "Questions décennale BTP, dommage ouvrage, sinistre. Réponse sous 24h.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | Optimum Assurance",
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
