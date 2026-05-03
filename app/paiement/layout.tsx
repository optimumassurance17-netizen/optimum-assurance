import { buildNoindexMetadata } from "@/lib/seo-noindex"

export const metadata = buildNoindexMetadata(
  "Paiement sécurisé",
  "Étape de paiement réservée au parcours en cours."
)

export default function PaiementLayout({ children }: { children: React.ReactNode }) {
  return children
}
