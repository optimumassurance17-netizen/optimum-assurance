import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site-url"

const baseUrl = SITE_URL

export default function CGDOLayout({ children }: { children: React.ReactNode }) {
  return children
}

export const metadata: Metadata = {
  title: "Conditions générales dommage ouvrage | Optimum Assurance",
  description:
    "Conditions générales du contrat d'assurance dommages-ouvrage distribué par Optimum Courtage (Accelerant Insurance). Document contractuel de référence avec le devis.",
  alternates: { canonical: `${baseUrl}/conditions-generales-dommage-ouvrage` },
  openGraph: {
    title: "Conditions générales dommage ouvrage | Optimum Assurance",
    description:
      "Cadre des garanties DO, exclusions, vie du contrat et obligations du maître d'ouvrage — Optimum Courtage.",
    url: `${baseUrl}/conditions-generales-dommage-ouvrage`,
    siteName: "Optimum Assurance",
    locale: "fr_FR",
    type: "website",
  },
}
