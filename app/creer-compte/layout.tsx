import { buildNoindexMetadata } from "@/lib/seo-noindex"

export const metadata = buildNoindexMetadata(
  "Créer un compte",
  "Création de compte liée à un dossier ou à un parcours en cours."
)

export default function CreerCompteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
