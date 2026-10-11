import { constructionAddressFromLead, readDoLeadConstructionCost } from "@/lib/do-attestation-facts"
import { calculerTarifDommageOuvrage } from "@/lib/tarification-dommage-ouvrage"

export type PendingDoQuote = {
  sourceLabel: string
  constructionCost: number | null
  indicativePremium: number | null
  chantier: string
}

function parseQuestionnaire(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function quoteFromRecord(record: Record<string, unknown>, sourceLabel: string): PendingDoQuote {
  const constructionCost = readDoLeadConstructionCost(record)
  const tarif = constructionCost != null ? calculerTarifDommageOuvrage(constructionCost) : null
  return {
    sourceLabel,
    constructionCost,
    indicativePremium: tarif?.primeAnnuelle ?? null,
    chantier: constructionAddressFromLead(record),
  }
}

/** Devis DO encore à préparer : le questionnaire est là, le contrat plateforme non. */
export function describePendingDoQuote(input: {
  hasDoContract: boolean
  initialJson?: string | null
  etudeJson?: string | null
}): PendingDoQuote | null {
  if (input.hasDoContract) return null
  const etude = parseQuestionnaire(input.etudeJson)
  if (etude) return quoteFromRecord(etude, "Questionnaire d'étude")
  const initial = parseQuestionnaire(input.initialJson)
  if (initial) return quoteFromRecord(initial, "Demande de devis")
  return null
}
