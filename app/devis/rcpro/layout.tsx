import type { Metadata } from "next"
import { absoluteBrandTitle } from "@/lib/seo-title"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: absoluteBrandTitle("Devis RC Pro hors bâtiment | Simulation en ligne"),
  description:
    "Simulation RC Pro hors bâtiment : obtenez un tarif indicatif en ligne pour votre activité professionnelle hors construction.",
  alternates: {
    canonical: `${baseUrl}/devis/rcpro`,
  },
  openGraph: {
    url: `${baseUrl}/devis/rcpro`,
    title: "Devis RC Pro hors bâtiment | Optimum Assurance",
    description:
      "Simulation RC Pro hors bâtiment : tarif indicatif en ligne pour votre activité professionnelle.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Devis RC Pro hors bâtiment | Optimum Assurance",
    images: [`${baseUrl}/opengraph-image`],
  },
}

export default function RcProLayout({ children }: { children: React.ReactNode }) {
  return children
}
