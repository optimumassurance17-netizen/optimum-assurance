export type FaqEntry = { q: string; r: string }

export type DecennaleLocalPayload = {
  metierSlug: string
  metierNom: string
  villeSlug: string
  villeNom: string
  population: number | null
  description: string
  risques: string | null
  /** Libellé prêt à l’affichage (équivalent mensuel ou prime indicative annuelle) */
  prixIndicatif: string
  bodyExtra: string | null
  indexable: boolean
  contentHash: string | null
}

export type DoLocalPayload = {
  slug: string
  nom: string
  villeSlug: string
  villeNom: string
  population: number | null
  description: string
  bodyExtra: string | null
  indexable: boolean
  contentHash: string | null
}

export type InternalLink = { href: string; label: string }
