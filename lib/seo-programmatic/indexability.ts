import { DO_SEO } from "@/lib/dommage-ouvrage-seo"
import { METIERS_SEO } from "@/lib/metiers-seo"
import type { InternalLink } from "@/lib/seo-programmatic/types"

/**
 * Décision d'indexation des pages ville.
 *
 * Le métier, les activités assurables, les exclusions et le tarif sont nationaux.
 * Le paragraphe local est le même pour tous les métiers d'une ville : il décrit
 * le bâti, pas une offre distincte. Ces URL restent accessibles, mais la page
 * métier (ou le profil dommage ouvrage) est le document canonique.
 *
 * N'ajouter une clé `metier/ville` ou `profil/ville` que lorsqu'un contenu local
 * vérifiable et propre à ce couple a été rédigé. Une liste vide est volontaire.
 */
const INDEXABLE_DECENNALE_CITY_KEYS = new Set<string>([])
const INDEXABLE_DO_CITY_KEYS = new Set<string>([])

export type CityIndexDecision = {
  canonicalPath: string
  index: boolean
  follow: true
}

export function resolveDecennaleCityIndex(metierSlug: string, villeSlug: string): CityIndexDecision {
  const self = `/assurance-decennale/${metierSlug}/${villeSlug}`
  const parent = `/assurance-decennale/${metierSlug}`
  if (INDEXABLE_DECENNALE_CITY_KEYS.has(`${metierSlug}/${villeSlug}`)) {
    return { canonicalPath: self, index: true, follow: true }
  }
  return { canonicalPath: parent, index: false, follow: true }
}

export function resolveDoCityIndex(slug: string, villeSlug: string): CityIndexDecision {
  const self = `/dommage-ouvrage/${slug}/${villeSlug}`
  const parent = `/dommage-ouvrage/${slug}`
  if (INDEXABLE_DO_CITY_KEYS.has(`${slug}/${villeSlug}`)) {
    return { canonicalPath: self, index: true, follow: true }
  }
  return { canonicalPath: parent, index: false, follow: true }
}

export function listIndexableProgrammaticSitemapPaths(): {
  path: string
  changeFrequency: "monthly"
  priority: number
}[] {
  const out: { path: string; changeFrequency: "monthly"; priority: number }[] = []
  for (const key of INDEXABLE_DECENNALE_CITY_KEYS) {
    const decision = resolveDecennaleCityIndex(key.split("/")[0] ?? "", key.split("/")[1] ?? "")
    if (!decision.index || decision.canonicalPath !== `/assurance-decennale/${key}`) continue
    out.push({ path: decision.canonicalPath, changeFrequency: "monthly", priority: 0.7 })
  }
  for (const key of INDEXABLE_DO_CITY_KEYS) {
    const decision = resolveDoCityIndex(key.split("/")[0] ?? "", key.split("/")[1] ?? "")
    if (!decision.index || decision.canonicalPath !== `/dommage-ouvrage/${key}`) continue
    out.push({ path: decision.canonicalPath, changeFrequency: "monthly", priority: 0.7 })
  }
  return out
}

export function relatedNationalDecennaleLinks(currentSlug: string, limit = 6): InternalLink[] {
  const current = METIERS_SEO.find((entry) => entry.slug === currentSlug)
  if (!current) return []

  const parent = METIERS_SEO.find(
    (entry) =>
      entry.kind === "headterm" &&
      entry.slug !== current.slug &&
      entry.relatedActivitySlugs.includes(current.slug)
  )
  const related = current.relatedActivitySlugs
    .map((slug) => METIERS_SEO.find((entry) => entry.slug === slug))
    .filter((entry): entry is (typeof METIERS_SEO)[number] => entry != null && entry.slug !== current.slug)
  const sameCategory = METIERS_SEO.filter(
    (entry) => entry.kind === "activity" && entry.categorie === current.categorie && entry.slug !== current.slug
  )
  const headterms = METIERS_SEO.filter((entry) => entry.kind === "headterm" && entry.slug !== current.slug)

  const ordered = [parent, ...related, ...sameCategory, ...headterms].filter(
    (entry): entry is (typeof METIERS_SEO)[number] => entry != null
  )
  const seen = new Set<string>()
  const links: InternalLink[] = []
  for (const entry of ordered) {
    if (seen.has(entry.slug)) continue
    seen.add(entry.slug)
    links.push({
      href: `/assurance-decennale/${entry.slug}`,
      label: `Assurance décennale ${entry.nom}`,
    })
    if (links.length >= limit) break
  }
  return links
}

export function nationalDecennaleResourceLinks(activityName?: string): InternalLink[] {
  const anchor = activityName
    ? `/assurance-decennale/activites#${activityName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`
    : "/assurance-decennale/activites"
  return [
    { href: "/devis-assurance-decennale-en-ligne", label: "Devis décennale en ligne" },
    { href: "/prix-assurance-decennale", label: "Prix de l'assurance décennale" },
    { href: "/documents-assurance-decennale", label: "Documents pour le dossier" },
    { href: anchor, label: "Activités assurables et exclusions" },
    { href: "/guides/obligation-decennale", label: "Obligation décennale" },
    { href: "/guides/que-couvre-assurance-decennale", label: "Ce que couvre la décennale" },
  ]
}

export function relatedNationalDoLinks(currentSlug: string): InternalLink[] {
  return DO_SEO.filter((entry) => entry.slug !== currentSlug).map((entry) => ({
    href: `/dommage-ouvrage/${entry.slug}`,
    label: `Dommage ouvrage ${entry.nom}`,
  }))
}

export function nationalDoResourceLinks(): InternalLink[] {
  return [
    { href: "/devis-dommage-ouvrage", label: "Devis dommage ouvrage" },
    { href: "/dommage-ouvrage", label: "Profils dommage ouvrage" },
    { href: "/guides/obligation-dommage-ouvrage", label: "Obligation dommage ouvrage" },
    { href: "/guides/quand-souscrire-dommage-ouvrage", label: "Quand souscrire la dommage ouvrage" },
    { href: "/comparatifs/dommage-ouvrage-vs-decennale", label: "Dommage ouvrage et décennale" },
  ]
}
