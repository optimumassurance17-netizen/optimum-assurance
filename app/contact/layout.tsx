import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "Contact Assurance Décennale | Optimum Assurance",
  description:
    "Contactez Optimum Assurance : questions sur l'assurance décennale BTP, dommage ouvrage, sinistre. Réponse sous 24h. Formulaire et assistant en ligne.",
  alternates: { canonical: `${baseUrl}/contact` },
  openGraph: {
    url: `${baseUrl}/contact`,
    title: "Contact | Optimum Assurance",
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
