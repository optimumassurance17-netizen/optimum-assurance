import type { MetierSlug } from "@/lib/metiers-seo"

/**
 * Activités (libellés exacts ACTIVITES_BTP) préremplies quand on arrive depuis /assurance-decennale/[metier].
 */
export const METIER_DEVIS_ACTIVITES_PREFILL: Record<MetierSlug, readonly string[]> = {
  plombier: ["Plomberie sanitaire"],
  electricien: ["Électricité générale"],
  peintre: ["Peinture intérieure"],
  carreleur: ["Carrelage"],
  macon: ["Maçonnerie générale"],
  couvreur: ["Couverture tuiles"],
  menuisier: ["Menuiserie extérieure"],
  charpentier: ["Charpente bois"],
  "fondation-speciale": ["Fondation spéciale"],
  "forage-micropieux": ["Forage micropieux"],
}

export function getMetierPrefillActivites(slug: string | null | undefined): string[] {
  if (!slug?.trim()) return []
  const s = slug.trim() as MetierSlug
  const row = METIER_DEVIS_ACTIVITES_PREFILL[s]
  return row ? [...row] : []
}
