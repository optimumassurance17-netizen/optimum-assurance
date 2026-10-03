import type { Metadata } from "next"
import { absoluteBrandTitle } from "@/lib/seo-title"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: absoluteBrandTitle("Activité non listée — demande d'étude"),
  description:
    "Votre domaine d'activité BTP n'apparaît pas dans notre liste ? Décrivez votre métier : notre équipe étudie votre dossier et vous recontacte sous 24 h.",
  alternates: { canonical: `${baseUrl}/etude/domaine` },
  openGraph: {
    url: `${baseUrl}/etude/domaine`,
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
}

export default function EtudeDomaineLayout({ children }: { children: React.ReactNode }) {
  return children
}
