import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Émission et validité des attestations",
  description:
    "Conditions d'émission et de validité des attestations d'assurance décennale et dommages-ouvrage — Optimum Courtage, ORIAS LPS 28931947, Accelerant Insurance.",
  alternates: {
    canonical: `${baseUrl}/conditions-attestations`,
  },
  openGraph: {
    url: `${baseUrl}/conditions-attestations`,
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ConditionsAttestationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
