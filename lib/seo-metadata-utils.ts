/** Troncature pour meta description (mots entiers, évite les coupures « mi… »). */
const ELLIPSIS = "…"

export function truncateForDescription(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, " ").trim()
  if (t.length <= maxChars) return t
  const budget = maxChars - ELLIPSIS.length
  if (budget <= 8) return t.slice(0, maxChars)
  const cut = t.slice(0, budget)
  const lastSpace = cut.lastIndexOf(" ")
  const base = lastSpace > 32 ? cut.slice(0, lastSpace) : cut
  return base.trimEnd() + ELLIPSIS
}

/** Assemble un lead + corps long en une description unique ≤ maxChars. */
export function buildProgrammaticMetaDescription(lead: string, body: string | null | undefined, maxChars = 158): string {
  const b = (body ?? "").replace(/\s+/g, " ").trim()
  if (!b) return truncateForDescription(lead.trim(), maxChars)
  const combined = `${lead.trim()} ${b}`
  return truncateForDescription(combined, maxChars)
}
