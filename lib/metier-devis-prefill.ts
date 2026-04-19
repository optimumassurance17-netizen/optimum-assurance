import { getDecennaleSeoActivity, type DecennaleSeoSlug } from "@/lib/decennale-seo-catalog"

/**
 * Activités (libellés exacts ACTIVITES_BTP) préremplies quand on arrive depuis /assurance-decennale/[metier].
 * Pour les pages SEO dérivées du catalogue, on réinjecte directement l'activité source.
 */
export const METIER_DEVIS_ACTIVITES_PREFILL: Partial<Record<DecennaleSeoSlug, readonly string[]>> = {}

export function getMetierPrefillActivites(slug: string | null | undefined): string[] {
  if (!slug?.trim()) return []
  const s = slug.trim() as DecennaleSeoSlug
  const row = METIER_DEVIS_ACTIVITES_PREFILL[s]
  if (row?.length) return [...row]

  const catalogItem = getDecennaleSeoActivity(s)
  return catalogItem ? [catalogItem.activiteSource] : []
}
