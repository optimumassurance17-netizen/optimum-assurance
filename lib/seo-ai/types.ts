export type AiTone = "premium" | "accessible"

export type AiPagePayload = {
  title: string
  meta_description: string
  h1: string
  /** Markdown : titres ## ###, listes, table optionnelle */
  content_markdown: string
  faq: { q: string; r: string }[]
  secondary_keywords: string[]
  /** Angle éditorial utilisé (traçabilité anti-duplication) */
  angle_editorial: string
}

export type MetierContext = {
  nom: string
  slug: string
  description_courte?: string
  risques_typiques?: string
}

export type VilleContext = {
  nom: string
  slug: string
  population?: number
}

export type TypeProjetContext = {
  nom: string
  slug: string
  description_courte?: string
}
