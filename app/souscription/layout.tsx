import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Souscription",
  alternates: {
    canonical: `${baseUrl}/souscription`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function SouscriptionLayout({ children }: { children: React.ReactNode }) {
  return children
}
