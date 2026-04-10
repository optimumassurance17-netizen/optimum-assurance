import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Paiement",
  description: "Page de paiement client Optimum Assurance.",
  alternates: {
    canonical: `${baseUrl}/paiement`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function PaiementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
