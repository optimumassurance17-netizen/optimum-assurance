import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://optimum-assurance.fr"

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace client Optimum Assurance pour accéder à vos documents et attestations.",
  alternates: {
    canonical: `${baseUrl}/connexion`,
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function ConnexionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
