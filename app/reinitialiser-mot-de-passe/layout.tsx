import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe",
  alternates: {
    canonical: `${baseUrl}/reinitialiser-mot-de-passe`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function ReinitialiserMotDePasseLayout({ children }: { children: React.ReactNode }) {
  return children
}
