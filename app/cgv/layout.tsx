import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales de vente d'Optimum Assurance. Devis, souscription, paiement, avenants, résiliation, assurance décennale BTP.",
  alternates: {
    canonical: `${baseUrl}/cgv`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function CGVLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
