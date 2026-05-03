import type { Metadata } from "next"
import { noindexMetadata } from "@/lib/seo-noindex"

export const metadata: Metadata = {
  title: "Résultat devis RC Pro",
  description:
    "Résultat indicatif d'un devis RC Pro calculé à partir de votre simulation. Reprenez le formulaire pour recalculer un tarif.",
  ...noindexMetadata,
}

export default function RcProResultLayout({ children }: { children: React.ReactNode }) {
  return children
}
