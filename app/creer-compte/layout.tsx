import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Créer un compte",
  alternates: {
    canonical: `${baseUrl}/creer-compte`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function CreerCompteLayout({ children }: { children: React.ReactNode }) {
  return children
}
