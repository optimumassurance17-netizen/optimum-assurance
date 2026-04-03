import type { AiPagePayload } from "./types"

/** Corps stocké en base : Markdown + FAQ + mots-clés (traçabilité SEO). */
export function buildStoredContenu(payload: AiPagePayload): string {
  const kw = payload.secondary_keywords.length
    ? `\n\n---\n*Mots-clés secondaires :* ${payload.secondary_keywords.join(", ")}.`
    : ""
  const faqBlock =
    payload.faq.length > 0
      ? `\n\n## Questions fréquentes\n\n${payload.faq
          .map((f) => `### ${f.q}\n\n${f.r}`)
          .join("\n\n")}`
      : ""
  return `${payload.content_markdown}${faqBlock}${kw}\n\n---\n*Angle éditorial :* ${payload.angle_editorial}`
}
