import type { ActivityResolution, ActivityMatch } from "@/lib/activity-nomenclature"

export type NomenclatureDocumentProjection = {
  guaranteedLines: string[]
  uncoveredAlerts: string[]
  guaranteedRawNames: string[]
  guaranteedCodes: string[]
}

function shortDefinition(definition: string, maxLen = 140): string {
  const trimmed = definition.trim()
  if (trimmed.length <= maxLen) return trimmed
  const cut = trimmed.slice(0, maxLen)
  const idx = cut.lastIndexOf(" ")
  return `${(idx > 40 ? cut.slice(0, idx) : cut).trim()}...`
}

export function formatResolutionForDocuments(resolution: ActivityResolution): NomenclatureDocumentProjection {
  const guaranteedLines = resolution.matched.map(
    (m) => `- ${m.code} ${m.name} : ${shortDefinition(m.definition)}`
  )
  const uncoveredAlerts = resolution.unmatched.map((u) => {
    const near = u.suggestedMatch
      ? ` Activité proche suggérée : ${u.suggestedMatch.code} ${u.suggestedMatch.name} (${u.suggestedMatch.score}%).`
      : ""
    return `Cette activité n’est pas couverte faute de correspondance nomenclature : "${u.userInput}".${near}`
  })
  return {
    guaranteedLines,
    uncoveredAlerts,
    guaranteedRawNames: resolution.matched.map((m) => m.name),
    guaranteedCodes: resolution.matched.map((m) => m.code),
  }
}

export function summarizeGuaranteedActivities(matches: ActivityMatch[]): string[] {
  return matches.map((m) => `- ${m.code} ${m.name} : ${shortDefinition(m.definition, 170)}`)
}

