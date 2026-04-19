import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Espace client",
  description: "Accès privé aux documents et opérations client Optimum Assurance.",
  alternates: {
    canonical: `${baseUrl}/espace-client`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function EspaceClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
