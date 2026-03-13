import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité et protection des données personnelles - Optimum Assurance.",
  alternates: {
    canonical: `${baseUrl}/confidentialite`,
  },
}

export default function ConfidentialiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
