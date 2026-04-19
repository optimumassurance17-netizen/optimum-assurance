import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Souscription dommage ouvrage",
  alternates: {
    canonical: `${baseUrl}/souscription-dommage-ouvrage`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function SouscriptionDommageOuvrageLayout({ children }: { children: React.ReactNode }) {
  return children
}
