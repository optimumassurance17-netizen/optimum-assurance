import type { ActivityHierarchySelection } from "@/lib/activity-hierarchy-format"

export type ExclusionRiskLevel = "low" | "medium" | "high"
export type ExclusionLevel = "global" | "activity" | "subActivity"

export type Exclusion = {
  id: string
  title: string
  description: string
  relatedActivityCode?: string
  level: ExclusionLevel
  isOptimized: boolean
  riskLevel: ExclusionRiskLevel
}

export type ExclusionScore = {
  restrictiveness: number
  competitiveness: number
}

type ExclusionContext = {
  activities: string[]
  normalizedActivities: string[]
  codes: Set<string>
  activityRoots: Set<string>
  terms: Set<string>
}

type ExclusionRule = {
  id: string
  title: string
  level: ExclusionLevel
  riskLevel: ExclusionRiskLevel
  relatedActivityCode?: string
  isOptimized: boolean
  marketReferences: string[]
  optimizedDescription: string
  applies: (ctx: ExclusionContext) => boolean
}

export type OptimizedExclusionsResult = {
  exclusions: Exclusion[]
  lines: string[]
  score: ExclusionScore
}

export type OptimizedExclusionSummary = {
  exclusions: string[]
  lines: string[]
  score: ExclusionScore
}

type ExclusionDataCandidate = {
  [key: string]: unknown
  exclusionsOptimisees?: unknown
  optimizedExclusionLines?: unknown
  activityExclusions?: unknown
  exclusionsActivites?: unknown
  exclusions?: unknown
}

const GLOBAL_RULES: ExclusionRule[] = [
  {
    id: "global-activities-declarees",
    title: "Travaux hors activites declarees",
    level: "global",
    riskLevel: "low",
    isOptimized: true,
    marketReferences: [
      "Version restrictive: exclusion generale de tout chantier annexe",
      "Version ouverte: limitation aux seules activites non declarees",
    ],
    optimizedDescription:
      "Les travaux realises en dehors des activites declarees ne sont pas couverts.",
    applies: () => true,
  },
  {
    id: "global-techniques-non-courantes",
    title: "Techniques non courantes non validees",
    level: "global",
    riskLevel: "medium",
    isOptimized: true,
    marketReferences: [
      "Version restrictive: exclusion de toute technique non traditionnelle",
      "Version ouverte: exclusion limitee aux techniques sans avis technique valide",
    ],
    optimizedDescription:
      "Les techniques non courantes restent couvertes lorsqu'elles sont validees par un avis technique ou equivalent ; a defaut, elles sont exclues.",
    applies: () => true,
  },
  {
    id: "global-qualification",
    title: "Qualification requise",
    level: "global",
    riskLevel: "low",
    isOptimized: true,
    marketReferences: [
      "Version restrictive: exclusion de lots entiers",
      "Version ouverte: limitation aux interventions necessitant une qualification absente",
    ],
    optimizedDescription:
      "Les travaux necessitant une qualification reglementaire non detenue par l'assure restent exclus jusqu'a regularisation.",
    applies: () => true,
  },
]

const ACTIVITY_RULES: ExclusionRule[] = [
  {
    id: "masonry-special-foundations",
    title: "Fondations speciales non declarees",
    level: "activity",
    riskLevel: "medium",
    relatedActivityCode: "2.1",
    isOptimized: true,
    marketReferences: [
      "Version restrictive: exclusion complete des fondations profondes",
      "Version ouverte: declaration complementaire des fondations speciales",
    ],
    optimizedDescription:
      "Les fondations speciales non declarees (pieux, micropieux, reprises lourdes) necessitent une declaration prealable pour etre couvertes.",
    applies: (ctx) =>
      hasCodePrefix(ctx, "2.1") ||
      hasCodePrefix(ctx, "2.2") ||
      hasAnyTerm(ctx, ["fondation", "maconnerie", "beton", "gros oeuvre"]),
  },
  {
    id: "roofing-waterproofing-implementation",
    title: "Etancheite en couverture",
    level: "activity",
    riskLevel: "medium",
    relatedActivityCode: "3.1",
    isOptimized: true,
    marketReferences: [
      "Version restrictive: exclusion de tout desordre d'etancheite",
      "Version ouverte: exclusion limitee aux defauts manifestes de mise en oeuvre",
    ],
    optimizedDescription:
      "Les desordres d'etancheite directement lies a une mise en oeuvre manifestement non conforme aux regles de l'art ne sont pas couverts.",
    applies: (ctx) =>
      hasCodePrefix(ctx, "3.1") ||
      hasAnyTerm(ctx, ["couverture", "toiture", "ardoise", "tuile", "zinguerie"]),
  },
  {
    id: "electricity-standard-compliance",
    title: "Conformite normative electricite",
    level: "activity",
    riskLevel: "medium",
    relatedActivityCode: "5.5",
    isOptimized: true,
    marketReferences: [
      "Version restrictive: exclusion globale des incidents electriques",
      "Version ouverte: exclusion reservee aux non-conformites normatives",
    ],
    optimizedDescription:
      "Les installations electriques ou de telecommunication non conformes aux normes en vigueur ne sont pas couvertes.",
    applies: (ctx) =>
      hasCodePrefix(ctx, "5.5") ||
      hasAnyTerm(ctx, ["electricite", "telecommunication", "courant fort", "courant faible"]),
  },
  {
    id: "photovoltaic-qualification",
    title: "Photovoltaique sous condition de qualification",
    level: "subActivity",
    riskLevel: "low",
    relatedActivityCode: "5.5",
    isOptimized: true,
    marketReferences: [
      "Version restrictive: exclusion complete du photovoltaique",
      "Version ouverte: couverture maintenue sous condition de qualification et de conformite",
    ],
    optimizedDescription:
      "Les installations photovoltaiques sont couvertes sous reserve de qualification adaptee et de conformite aux normes applicables.",
    applies: (ctx) =>
      hasAnyTerm(ctx, ["photovoltaique", "pv", "panneau solaire", "solaire"]),
  },
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseCodePrefix(activity: string): string | null {
  const match = activity.match(/^([0-9]+(?:\.[0-9]+){0,2}|PI(?:-[A-Z]+)?)/i)
  return match?.[1] ?? null
}

function buildContext(
  activities: string[],
  selections?: ActivityHierarchySelection[]
): ExclusionContext {
  const cleanActivities = activities
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  const normalizedActivities = cleanActivities.map(normalizeText)
  const codes = new Set<string>()
  const activityRoots = new Set<string>()
  const terms = new Set<string>()

  for (const activity of cleanActivities) {
    const parsedCode = parseCodePrefix(activity)
    if (parsedCode) {
      codes.add(parsedCode)
      activityRoots.add(parsedCode.split(".").slice(0, 2).join("."))
    }
    for (const token of normalizeText(activity).split(" ")) {
      if (token.length >= 3) terms.add(token)
    }
  }

  if (selections?.length) {
    for (const selection of selections) {
      codes.add(selection.group.code)
      if (selection.activity) {
        codes.add(selection.activity.code)
        activityRoots.add(selection.activity.code.split(".").slice(0, 2).join("."))
      }
      if (selection.subActivity) {
        codes.add(selection.subActivity.code)
        activityRoots.add(selection.subActivity.code.split(".").slice(0, 2).join("."))
      }
      const refs = [
        selection.group.name,
        selection.activity?.name,
        selection.subActivity?.name,
      ].filter(Boolean)
      for (const ref of refs) {
        for (const token of normalizeText(String(ref)).split(" ")) {
          if (token.length >= 3) terms.add(token)
        }
      }
    }
  }

  return {
    activities: cleanActivities,
    normalizedActivities,
    codes,
    activityRoots,
    terms,
  }
}

function hasCodePrefix(ctx: ExclusionContext, prefix: string): boolean {
  const normalizedPrefix = prefix.trim()
  for (const code of ctx.codes) {
    if (code === normalizedPrefix || code.startsWith(`${normalizedPrefix}.`)) return true
  }
  for (const root of ctx.activityRoots) {
    if (root === normalizedPrefix || root.startsWith(normalizedPrefix)) return true
  }
  return false
}

function hasAnyTerm(ctx: ExclusionContext, terms: string[]): boolean {
  return terms.some((term) => {
    const normalized = normalizeText(term)
    return ctx.terms.has(normalized)
  })
}

function dedupeExclusions(exclusions: Exclusion[]): Exclusion[] {
  const byId = new Map<string, Exclusion>()
  for (const exclusion of exclusions) {
    if (!byId.has(exclusion.id)) byId.set(exclusion.id, exclusion)
  }
  return [...byId.values()]
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function extractOptimizedExclusionLines(
  value: ExclusionDataCandidate | null | undefined
): string[] {
  if (!value) return []
  const candidates = [
    toStringArray(value.exclusionsOptimisees),
    toStringArray(value.optimizedExclusionLines),
    toStringArray(value.activityExclusions),
    toStringArray(value.exclusionsActivites),
    toStringArray(value.exclusions),
  ]
  return candidates.find((items) => items.length > 0) ?? []
}

function computeExclusionScore(exclusions: Exclusion[]): ExclusionScore {
  if (!exclusions.length) {
    return { restrictiveness: 0, competitiveness: 100 }
  }

  const riskWeight: Record<ExclusionRiskLevel, number> = {
    low: 0.32,
    medium: 0.55,
    high: 0.8,
  }
  const levelWeight: Record<ExclusionLevel, number> = {
    global: 1,
    activity: 0.82,
    subActivity: 0.7,
  }

  const total = exclusions.reduce((sum, exclusion) => {
    const optimizedFactor = exclusion.isOptimized ? 0.72 : 1
    return sum + riskWeight[exclusion.riskLevel] * levelWeight[exclusion.level] * optimizedFactor
  }, 0)

  const average = total / exclusions.length
  const densityFactor = clamp(exclusions.length / 7, 0.5, 1.15)
  const restrictiveness = clamp(Math.round(average * densityFactor * 100), 0, 100)
  const competitiveness = clamp(100 - restrictiveness + Math.round((7 - exclusions.length) * 2), 0, 100)

  return {
    restrictiveness,
    competitiveness,
  }
}

function toExclusion(rule: ExclusionRule): Exclusion {
  return {
    id: rule.id,
    title: rule.title,
    description: rule.optimizedDescription,
    relatedActivityCode: rule.relatedActivityCode,
    level: rule.level,
    isOptimized: rule.isOptimized,
    riskLevel: rule.riskLevel,
  }
}

export function formatOptimizedExclusionsForDocuments(lines: string[]): string {
  if (!lines.length) return ""
  return `Ne sont pas couverts :\n- ${lines.join("\n- ")}`
}

export function generateOptimizedExclusions(
  activities: string[],
  options?: {
    selections?: ActivityHierarchySelection[]
    includeGlobal?: boolean
  }
): OptimizedExclusionsResult {
  const ctx = buildContext(activities, options?.selections)
  const includeGlobal = options?.includeGlobal !== false
  const selected: Exclusion[] = []

  if (includeGlobal) {
    for (const rule of GLOBAL_RULES) {
      if (rule.applies(ctx)) selected.push(toExclusion(rule))
    }
  }

  for (const rule of ACTIVITY_RULES) {
    if (rule.applies(ctx)) selected.push(toExclusion(rule))
  }

  const exclusions = dedupeExclusions(selected)
  const lines = exclusions.map((item) => item.description)
  const score = computeExclusionScore(exclusions)

  return {
    exclusions,
    lines,
    score,
  }
}

export function buildOptimizedExclusionSummary(
  activities: string[],
  options?: {
    selections?: ActivityHierarchySelection[]
    includeGlobal?: boolean
  }
): OptimizedExclusionSummary {
  const result = generateOptimizedExclusions(activities, options)
  return {
    exclusions: dedupeStrings(result.lines),
    lines: dedupeStrings(result.lines),
    score: result.score,
  }
}

export function buildOptimizedExclusionLibrary(): Exclusion[] {
  const fromGlobal = GLOBAL_RULES.map(toExclusion)
  const fromActivity = ACTIVITY_RULES.map(toExclusion)
  return dedupeExclusions([...fromGlobal, ...fromActivity])
}

export function getMarketExclusionReferences(): Record<string, string[]> {
  const refs: Record<string, string[]> = {}
  for (const rule of [...GLOBAL_RULES, ...ACTIVITY_RULES]) {
    refs[rule.id] = [...rule.marketReferences]
  }
  return refs
}
