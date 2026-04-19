import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Demande d'étude décennale | Optimum Assurance",
  description: truncateForDescription(
    "Demande d'étude personnalisée pour dossier décennale avec sinistralité, activité complexe ou analyse manuelle. Réponse par notre équipe sous 24 h ouvrées.",
    158
  ),
  alternates: {
    canonical: `${baseUrl}/etude`,
  },
  openGraph: {
    type: "website",
    url: `${baseUrl}/etude`,
    title: "Demande d'étude décennale | Optimum Assurance",
    description:
      "Étude personnalisée pour dossier décennale hors parcours standard : sinistralité, activité complexe, demande manuelle.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Demande d'étude décennale | Optimum Assurance",
    description: "Étude personnalisée pour dossier décennale hors parcours standard.",
    images: [`${baseUrl}/opengraph-image`],
  },
}

export default function EtudeLayout({ children }: { children: React.ReactNode }) {
  return children
}
