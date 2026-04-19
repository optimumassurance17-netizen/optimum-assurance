import { buildNoindexMetadata } from "@/lib/seo-noindex"

export const metadata = buildNoindexMetadata(
  "Mandat SEPA",
  "Mandat de prélèvement SEPA lié à votre dossier Optimum Assurance."
)

export default function MandatSepaLayout({ children }: { children: React.ReactNode }) {
  return children
}
