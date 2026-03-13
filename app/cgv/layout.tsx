import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

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
