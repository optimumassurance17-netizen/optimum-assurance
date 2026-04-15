import type { Metadata } from "next"
import { buildNoindexMetadata } from "@/lib/seo-noindex"

export const metadata: Metadata = buildNoindexMetadata(
  "Signature électronique",
  "Signature du contrat et finalisation du parcours Optimum Assurance."
)

export default function SignatureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
