import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales d'Optimum Assurance - Assurance décennale BTP en ligne.",
  alternates: {
    canonical: `${baseUrl}/mentions-legales`,
  },
}

export default function MentionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
