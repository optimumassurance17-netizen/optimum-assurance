import { buildNoindexMetadata } from "@/lib/seo-noindex"

export const metadata = buildNoindexMetadata(
  "Souscription dommage ouvrage",
  "Parcours de souscription dommage ouvrage réservé au dossier en cours."
)

export default function SouscriptionDommageOuvrageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
