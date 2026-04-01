import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales d'Optimum Assurance - Assurance décennale BTP en ligne.",
  alternates: {
    canonical: `${baseUrl}/mentions-legales`,
  },
  openGraph: {
    url: `${baseUrl}/mentions-legales`,
    locale: "fr_FR",
    siteName: "Optimum Assurance",
    type: "website",
    images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: "Optimum Assurance" }],
  },
}

export default function MentionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
