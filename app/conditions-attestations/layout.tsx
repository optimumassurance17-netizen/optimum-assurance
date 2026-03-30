import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "Émission et validité des attestations",
  description:
    "Conditions d'émission et de validité des attestations d'assurance décennale et dommages-ouvrage — Optimum Courtage, ORIAS LPS 28931947, Axcelrant Insurance.",
  alternates: {
    canonical: `${baseUrl}/conditions-attestations`,
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
