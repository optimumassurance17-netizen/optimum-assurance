import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Devis RC Pro hors batiment | Simulation en ligne | Optimum Assurance",
  description:
    "Simulation RC Pro hors batiment : obtenez un tarif indicatif en ligne pour votre activite professionnelle hors construction.",
  alternates: {
    canonical: `${baseUrl}/devis/rcpro`,
  },
  openGraph: {
    url: `${baseUrl}/devis/rcpro`,
    title: "Devis RC Pro hors batiment | Optimum Assurance",
    description:
      "Simulation RC Pro hors batiment : tarif indicatif en ligne pour votre activite professionnelle.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Devis RC Pro hors batiment | Optimum Assurance",
    images: [`${baseUrl}/opengraph-image`],
  },
}

export default function RcProLayout({ children }: { children: React.ReactNode }) {
  return children
}
