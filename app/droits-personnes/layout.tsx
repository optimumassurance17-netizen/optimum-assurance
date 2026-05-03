import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"
import { truncateForDescription } from "@/lib/seo-metadata-utils"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Droits RGPD et données personnelles | Optimum Assurance",
  description: truncateForDescription(
    "Vos droits RGPD chez Optimum Assurance : accès, rectification, effacement, limitation, portabilité et réclamation CNIL. Procédure pour exercer vos droits.",
    158
  ),
  alternates: { canonical: `${baseUrl}/droits-personnes` },
  openGraph: {
    type: "website",
    url: `${baseUrl}/droits-personnes`,
    title: "Droits RGPD et données personnelles | Optimum Assurance",
    description:
      "Informations pour exercer vos droits sur vos données personnelles : accès, rectification, effacement, portabilité et CNIL.",
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Droits RGPD et données personnelles | Optimum Assurance",
    images: [`${baseUrl}/opengraph-image`],
  },
}

export default function DroitsPersonnesLayout({ children }: { children: React.ReactNode }) {
  return children
}
