import { constructionAddressFromLead, readDoLeadConstructionCost } from "@/lib/do-attestation-facts"
import { calculerTarifDommageOuvrage } from "@/lib/tarification-dommage-ouvrage"

export type PendingDoQuote = {
  sourceLabel: string
  constructionCost: number | null
  indicativePremium: number | null
  chantier: string
}

export type PendingDoQuoteStorageKey = "doEtudeQuestionnaireJson" | "doInitialQuestionnaireJson"

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

/** Le questionnaire affiché est celui qu'une correction doit réécrire. */
export function pendingDoQuoteStorageKey(input: {
  hasDoContract: boolean
  initialJson?: string | null
  etudeJson?: string | null
}): PendingDoQuoteStorageKey | null {
  if (input.hasDoContract) return null
  if (parseQuestionnaire(input.etudeJson)) return "doEtudeQuestionnaireJson"
  if (parseQuestionnaire(input.initialJson)) return "doInitialQuestionnaireJson"
  return null
}

export function parsePendingDoConstructionCost(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100) / 100
  }
  if (typeof value !== "string") return null
  const parsed = Number(value.trim().replace(/\s/g, "").replace(",", "."))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100) / 100
}

/**
 * Corrige l'adresse et le coût sur la demande déjà enregistrée.
 * Le questionnaire d'étude et la demande initiale gardent leur forme.
 */
export function applyPendingDoQuoteCorrection(
  record: Record<string, unknown>,
  patch: { chantier: string; constructionCost: number }
): Record<string, unknown> {
  const chantier = patch.chantier.trim()
  const next: Record<string, unknown> = {
    ...record,
    adresseConstruction: chantier,
    adresseChantier: chantier,
    projectAddress: chantier,
    codePostalConstruction: "",
    villeConstruction: "",
    projectPostalCode: "",
    projectCity: "",
    coutTotal: patch.constructionCost,
    coutConstruction: patch.constructionCost,
  }
  if (record.operation && typeof record.operation === "object" && !Array.isArray(record.operation)) {
    next.operation = {
      ...(record.operation as Record<string, unknown>),
      adresseChantier: chantier,
      codePostal: "",
      ville: "",
    }
  }
  if (record.cout && typeof record.cout === "object" && !Array.isArray(record.cout)) {
    next.cout = {
      ...(record.cout as Record<string, unknown>),
      coutTotalTtc: patch.constructionCost,
    }
  }
  return next
}
