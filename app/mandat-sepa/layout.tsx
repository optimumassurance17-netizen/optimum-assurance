import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export const metadata: Metadata = {
  title: "Mandat SEPA",
  alternates: {
    canonical: `${baseUrl}/mandat-sepa`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function MandatSepaLayout({ children }: { children: React.ReactNode }) {
  return children
}
