import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  alternates: {
    canonical: `${baseUrl}/mot-de-passe-oublie`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function MotDePasseOublieLayout({ children }: { children: React.ReactNode }) {
  return children
}
