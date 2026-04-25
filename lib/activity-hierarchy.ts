import "server-only"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/prisma-client"
import {
  ACTIVITE_EXCLUSIONS,
  ACTIVITE_TO_NOMENCLATURE,
} from "@/lib/nomenclature-activites"
import {
  buildFlatActivityLabels,
  buildHierarchyLinesFromSelections,
  type ActivityHierarchyResolution,
  type ActivityHierarchySelection,
  type ActivityNodeRef,
  type MissingHierarchyActivity,
} from "@/lib/activity-hierarchy-format"

type GroupDefinition = {
  code: string
  name: string
  definition: string
}

type ActivityDefinition = {
  code: string
  groupCode: string
  name: string
  definition: string
  includedWorks: string[]
  excludedWorks: string[]
  relatedActivities: string[]
  isAccessoryAllowed: boolean
}

type SubActivityDefinition = {
  code: string
  activityCode: string
  groupCode: string
  name: string
  description: string
  includedWorks: string[]
  excludedWorks: string[]
  relatedActivities: string[]
  aliases: string[]
}

type HierarchyStore = {
  groups: GroupDefinition[]
  activities: ActivityDefinition[]
  subActivities: SubActivityDefinition[]
}

type ResolveOptions = {
  userId?: string
  skipSeed?: boolean
}

type SearchOptions = {
  limit?: number
}

type CandidateScore = {
  kind: "group" | "activity" | "subActivity"
  score: number
  group: ActivityNodeRef
  activity?: ActivityNodeRef
  subActivity?: ActivityNodeRef
}

const GROUPS: GroupDefinition[] = [
  {
    code: "1",
    name: "Preparation et amenagement du site",
    definition: "1. Preparation et amenagement du site",
  },
  {
    code: "2",
    name: "Structure et gros oeuvre",
    definition: "2. Structure et gros oeuvre",
  },
  {
    code: "3",
    name: "Clos et couvert",
    definition: "3. Clos et couvert",
  },
  {
    code: "4",
    name: "Divisions - Amenagements - Finitions",
    definition: "4. Divisions - Amenagements - Finitions",
  },
  {
    code: "5",
    name: "Lots techniques et activites specifiques",
    definition: "5. Lots techniques et activites specifiques",
  },
  {
    code: "PI",
    name: "Professions intellectuelles du batiment",
    definition: "Professions intellectuelles du batiment",
  },
]

const SUB_ACTIVITY_SEED: SubActivityDefinition[] = [
  {
    code: "2.1.1",
    activityCode: "2.1",
    groupCode: "2",
    name: "Pieux",
    description: "Realisation de pieux et fondations profondes.",
    includedWorks: ["Pieux battus", "Pieux fores", "Fondations profondes"],
    excludedWorks: [],
    relatedActivities: ["2.1.2"],
    aliases: ["pieux", "fondations profondes"],
  },
  {
    code: "2.1.2",
    activityCode: "2.1",
    groupCode: "2",
    name: "Micropieux",
    description: "Micropieux et reprises en sous-oeuvre.",
    includedWorks: ["Micropieux", "Reprise en sous-oeuvre"],
    excludedWorks: [],
    relatedActivities: ["2.1.1"],
    aliases: ["micropieux", "micro pieux", "reprise en sous oeuvre"],
  },
  {
    code: "2.2.1",
    activityCode: "2.2",
    groupCode: "2",
    name: "Dallage",
    description: "Dallage beton arme et planchers bas.",
    includedWorks: ["Dallage", "Planchers bas"],
    excludedWorks: [],
    relatedActivities: ["2.2.2"],
    aliases: ["dallage", "dalle beton", "dalles beton", "chape beton"],
  },
  {
    code: "2.2.2",
    activityCode: "2.2",
    groupCode: "2",
    name: "Mur porteur",
    description: "Murs porteurs en maconnerie et beton arme.",
    includedWorks: ["Mur porteur", "Maconnerie structurelle"],
    excludedWorks: [],
    relatedActivities: ["2.2.1"],
    aliases: ["mur porteur", "murs porteurs", "maconnerie structurelle"],
  },
  {
    code: "3.1.1",
    activityCode: "3.1",
    groupCode: "3",
    name: "Tuiles",
    description: "Couvertures en tuiles et accessoires.",
    includedWorks: ["Pose de tuiles", "Refection toiture tuiles"],
    excludedWorks: [],
    relatedActivities: ["3.1.2"],
    aliases: ["tuiles", "tuile", "toiture tuile"],
  },
  {
    code: "3.1.2",
    activityCode: "3.1",
    groupCode: "3",
    name: "Ardoises",
    description: "Couvertures en ardoises et accessoires.",
    includedWorks: ["Pose d'ardoises", "Refection toiture ardoises"],
    excludedWorks: [],
    relatedActivities: ["3.1.1"],
    aliases: ["ardoises", "ardoise", "toiture ardoise"],
  },
]

const GLOBAL_ALIASES: Record<string, string> = {
  placo: "4.4",
  toiture: "3.1",
  clim: "5.4",
  "fondations beton": "2.1",
  "fondation beton": "2.1",
  "dalles beton": "2.2.1",
  "dalle beton": "2.2.1",
}

const CODE_DEFINITION_OVERRIDES: Record<
  string,
  {
    definition: string
    includedWorks: string[]
    excludedWorks: string[]
    isAccessoryAllowed?: boolean
  }
> = {
  "2.1": {
    definition: "Fondations et parois speciales.",
    includedWorks: ["Fondations profondes", "Parois speciales", "Reprises en sous-oeuvre"],
    excludedWorks: [],
  },
  "2.2": {
    definition: "Maconnerie et beton arme.",
    includedWorks: ["Dallage", "Murs porteurs", "Ouvrages en beton arme"],
    excludedWorks: [],
  },
  "3.1": {
    definition: "Couverture des batiments.",
    includedWorks: ["Toiture tuiles", "Toiture ardoises", "Refection couverture"],
    excludedWorks: ["Couvertures textiles"],
  },
  "4.4": {
    definition: "Platrerie, staff, stuc, gypserie.",
    includedWorks: ["Cloisons seches", "Faux plafonds", "Doublages"],
    excludedWorks: ["Elements structurels porteurs"],
    isAccessoryAllowed: true,
  },
  "5.4": {
    definition: "Installations d'aeraulique, de climatisation et de conditionnement d'air.",
    includedWorks: ["Climatisation", "Traitement d'air", "Ventilation"],
    excludedWorks: ["Systeme de captage geothermique"],
  },
}

let seedPromise: Promise<void> | null = null

function isSchemaDriftError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  )
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

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
}

function codeSortWeight(code: string): number[] {
  if (code.startsWith("PI")) return [99]
  return code
    .split(".")
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part))
}

function compareCodes(a: string, b: string): number {
  const wa = codeSortWeight(a)
  const wb = codeSortWeight(b)
  const max = Math.max(wa.length, wb.length)
  for (let i = 0; i < max; i += 1) {
    const va = wa[i] ?? -1
    const vb = wb[i] ?? -1
    if (va !== vb) return va - vb
  }
  return a.localeCompare(b, "fr")
}

function textSimilarity(input: string, candidate: string): number {
  if (!input || !candidate) return 0
  if (input === candidate) return 0.96
  if (input.includes(candidate) || candidate.includes(input)) return 0.88

  const inputTokens = tokenize(input)
  const candidateTokens = tokenize(candidate)
  if (!inputTokens.length || !candidateTokens.length) return 0

  let common = 0
  for (const token of inputTokens) {
    if (candidateTokens.includes(token)) common += 1
  }
  if (!common) return 0
  const ratio = common / Math.max(inputTokens.length, candidateTokens.length)
  return 0.45 + ratio * 0.45
}

function detectGroupCode(code: string): string {
  if (code.startsWith("PI")) return "PI"
  return code.split(".")[0] ?? "PI"
}

function buildCanonicalActivities(): ActivityDefinition[] {
  const map = new Map<string, ActivityDefinition>()
  const aliasesByCode = new Map<string, Set<string>>()
  const exclusionsByCode = new Map<string, Set<string>>()

  for (const [siteLabel, entries] of Object.entries(ACTIVITE_TO_NOMENCLATURE)) {
    const siteExclusions = ACTIVITE_EXCLUSIONS[siteLabel] ?? []
    for (const entry of entries) {
      if (!entry.code) continue
      if (!aliasesByCode.has(entry.code)) aliasesByCode.set(entry.code, new Set())
      aliasesByCode.get(entry.code)!.add(siteLabel)
      aliasesByCode.get(entry.code)!.add(entry.libelleOfficiel)
      if (!exclusionsByCode.has(entry.code)) exclusionsByCode.set(entry.code, new Set())
      for (const exclusion of siteExclusions) {
        exclusionsByCode.get(entry.code)!.add(exclusion)
      }

      if (map.has(entry.code)) continue
      const groupCode = detectGroupCode(entry.code)
      const override = CODE_DEFINITION_OVERRIDES[entry.code]
      map.set(entry.code, {
        code: entry.code,
        groupCode,
        name: entry.libelleOfficiel,
        definition: override?.definition ?? entry.libelleOfficiel,
        includedWorks: override?.includedWorks ?? [],
        excludedWorks: override?.excludedWorks ?? [],
        relatedActivities: [],
        isAccessoryAllowed: override?.isAccessoryAllowed ?? false,
      })
    }
  }

  for (const [code, activity] of map.entries()) {
    const override = CODE_DEFINITION_OVERRIDES[code]
    const related = aliasesByCode.get(code)
    const excluded = exclusionsByCode.get(code)
    if (related) {
      activity.relatedActivities = [...related]
        .map((label) => label.trim())
        .filter(Boolean)
        .slice(0, 20)
      if (!activity.includedWorks.length) {
        activity.includedWorks = activity.relatedActivities.slice(0, 12)
      }
    }
    if (excluded) {
      const merged = new Set<string>([
        ...(override?.excludedWorks ?? activity.excludedWorks),
        ...excluded,
      ])
      activity.excludedWorks = [...merged]
    }
  }

  return [...map.values()].sort((a, b) => compareCodes(a.code, b.code))
}

function inferSubActivitiesFromActivities(
  activities: ActivityDefinition[]
): SubActivityDefinition[] {
  const generated: SubActivityDefinition[] = []
  const byActivity = new Map<string, ActivityDefinition[]>()
  for (const activity of activities) {
    const key = activity.code
    if (!byActivity.has(key)) byActivity.set(key, [])
    byActivity.get(key)!.push(activity)
  }

  for (const [activityCode, items] of byActivity.entries()) {
    const source = items[0]
    const baseName = source.name
    const tokens = tokenize(baseName)
    const generatedCode = `${activityCode}.1`
    generated.push({
      code: generatedCode,
      activityCode,
      groupCode: source.groupCode,
      name: baseName,
      description: `Sous-activite de ${activityCode} ${baseName}`,
      includedWorks: source.includedWorks,
      excludedWorks: source.excludedWorks,
      relatedActivities: source.relatedActivities,
      aliases: [...tokens, baseName, activityCode],
    })
  }
  return generated
}

function canonicalHierarchy(): HierarchyStore {
  const activities = buildCanonicalActivities()
  const generatedSubs = inferSubActivitiesFromActivities(activities)
  const subByCode = new Map<string, SubActivityDefinition>()
  for (const sub of generatedSubs) subByCode.set(sub.code, sub)
  for (const sub of SUB_ACTIVITY_SEED) subByCode.set(sub.code, sub)
  return {
    groups: GROUPS,
    activities,
    subActivities: [...subByCode.values()].sort((a, b) => compareCodes(a.code, b.code)),
  }
}

export function buildActivityHierarchyExampleJson(): Record<string, unknown> {
  const hierarchy = canonicalHierarchy()
  const groupMap = new Map(hierarchy.groups.map((group) => [group.code, group]))
  const activitiesByGroup = new Map<string, ActivityDefinition[]>()
  const subByActivity = new Map<string, SubActivityDefinition[]>()

  for (const activity of hierarchy.activities) {
    if (!activitiesByGroup.has(activity.groupCode)) activitiesByGroup.set(activity.groupCode, [])
    activitiesByGroup.get(activity.groupCode)!.push(activity)
  }
  for (const sub of hierarchy.subActivities) {
    if (!subByActivity.has(sub.activityCode)) subByActivity.set(sub.activityCode, [])
    subByActivity.get(sub.activityCode)!.push(sub)
  }

  return {
    version: "france-assureurs-2019",
    groups: hierarchy.groups.map((group) => {
      const activities = (activitiesByGroup.get(group.code) ?? [])
        .sort((a, b) => compareCodes(a.code, b.code))
        .slice(0, 6)
        .map((activity) => ({
          code: activity.code,
          name: activity.name,
          definition: activity.definition,
          subActivities: (subByActivity.get(activity.code) ?? [])
            .sort((a, b) => compareCodes(a.code, b.code))
            .slice(0, 6)
            .map((sub) => ({
              code: sub.code,
              name: sub.name,
              description: sub.description,
            })),
        }))

      return {
        code: group.code,
        name: group.name,
        definition: group.definition,
        activities,
      }
    }),
    examples: {
      input: ["fondations beton", "dalles beton", "toiture tuiles"],
      outputHierarchy: [
        "2 - Structure et gros oeuvre",
        "2.1 Fondations et parois speciales",
        "2.1.1 Pieux",
        "2.2 Maconnerie et beton arme",
        "2.2.1 Dallage",
        "3 - Clos et couvert",
        "3.1 Couverture",
        "3.1.1 Tuiles",
      ],
    },
    note:
      "Si une sous-activite est selectionnee, le groupe et l'activite parente sont affiches automatiquement.",
    defaultGroup:
      groupMap.get("2")?.name ?? "Structure et gros oeuvre",
  }
}

async function loadHierarchyStore(): Promise<HierarchyStore> {
  type DbSubActivity = {
    code: string
    activityCode: string
    groupCode: string
    name: string
    description: string
    includedWorks: string | null
    excludedWorks: string | null
    relatedActivities: string | null
  }
  type DbActivity = {
    code: string
    groupCode: string
    name: string
    definition: string
    includedWorks: string | null
    excludedWorks: string | null
    relatedActivities: string | null
    isAccessoryAllowed: boolean
    subActivities: DbSubActivity[]
  }
  type DbGroup = {
    code: string
    name: string
    definition: string | null
    activities: DbActivity[]
  }

  let dbGroups: DbGroup[] = []
  try {
    dbGroups = await prisma.activityGroup.findMany({
      where: { isActive: true },
      include: {
        activities: {
          where: { isActive: true },
          include: {
            subActivities: { where: { isActive: true } },
          },
        },
      },
      orderBy: { code: "asc" },
    })
  } catch (error) {
    if (isSchemaDriftError(error)) return canonicalHierarchy()
    throw error
  }

  if (!dbGroups.length) return canonicalHierarchy()

  const groups: GroupDefinition[] = []
  const activities: ActivityDefinition[] = []
  const subActivities: SubActivityDefinition[] = []

  for (const group of dbGroups) {
    groups.push({
      code: group.code,
      name: group.name,
      definition: group.definition ?? group.name,
    })
    for (const activity of group.activities) {
      activities.push({
        code: activity.code,
        groupCode: activity.groupCode || group.code,
        name: activity.name,
        definition: activity.definition,
        includedWorks: splitTextList(activity.includedWorks),
        excludedWorks: splitTextList(activity.excludedWorks),
        relatedActivities: splitTextList(activity.relatedActivities),
        isAccessoryAllowed: activity.isAccessoryAllowed,
      })
      for (const sub of activity.subActivities) {
        subActivities.push({
          code: sub.code,
          activityCode: sub.activityCode || activity.code,
          groupCode: sub.groupCode || group.code,
          name: sub.name,
          description: sub.description,
          includedWorks: splitTextList(sub.includedWorks),
          excludedWorks: splitTextList(sub.excludedWorks),
          relatedActivities: splitTextList(sub.relatedActivities),
          aliases: [],
        })
      }
    }
  }

  groups.sort((a, b) => compareCodes(a.code, b.code))
  activities.sort((a, b) => compareCodes(a.code, b.code))
  subActivities.sort((a, b) => compareCodes(a.code, b.code))
  return { groups, activities, subActivities }
}

function splitTextList(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinTextList(values: string[]): string | null {
  if (!values.length) return null
  return values.join("||")
}

export async function ensureActivityHierarchySeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const canonical = canonicalHierarchy()

      for (const group of canonical.groups) {
      await prisma.activityGroup.upsert({
          where: { code: group.code },
          create: {
            code: group.code,
            name: group.name,
            definition: group.definition,
            version: "france-assureurs-2019",
          },
          update: {
            name: group.name,
            definition: group.definition,
            version: "france-assureurs-2019",
            isActive: true,
          },
        })
      }

      const dbGroups = await prisma.activityGroup.findMany({
        select: { id: true, code: true },
      })
      const groupIdByCode = new Map(dbGroups.map((group) => [group.code, group.id]))

      for (const activity of canonical.activities) {
        const groupId = groupIdByCode.get(activity.groupCode)
        if (!groupId) continue
      await prisma.activity.upsert({
          where: { code: activity.code },
          create: {
            groupId,
            groupCode: activity.groupCode,
            code: activity.code,
            name: activity.name,
            definition: activity.definition,
            includedWorks: joinTextList(activity.includedWorks),
            excludedWorks: joinTextList(activity.excludedWorks),
            relatedActivities: joinTextList(activity.relatedActivities),
            isAccessoryAllowed: activity.isAccessoryAllowed,
            version: "france-assureurs-2019",
          },
          update: {
            groupId,
            groupCode: activity.groupCode,
            name: activity.name,
            definition: activity.definition,
            includedWorks: joinTextList(activity.includedWorks),
            excludedWorks: joinTextList(activity.excludedWorks),
            relatedActivities: joinTextList(activity.relatedActivities),
            isAccessoryAllowed: activity.isAccessoryAllowed,
            version: "france-assureurs-2019",
            isActive: true,
          },
        })
      }

      const dbActivities = await prisma.activity.findMany({
        select: { id: true, code: true },
      })
      const activityIdByCode = new Map(dbActivities.map((activity) => [activity.code, activity.id]))

      for (const subActivity of canonical.subActivities) {
        const activityId = activityIdByCode.get(subActivity.activityCode)
        if (!activityId) continue
      await prisma.subActivity.upsert({
          where: { code: subActivity.code },
          create: {
            activityId,
            groupCode: subActivity.groupCode,
            activityCode: subActivity.activityCode,
            code: subActivity.code,
            name: subActivity.name,
            description: subActivity.description,
            includedWorks: joinTextList(subActivity.includedWorks),
            excludedWorks: joinTextList(subActivity.excludedWorks),
            relatedActivities: joinTextList(subActivity.relatedActivities),
            version: "france-assureurs-2019",
          },
          update: {
            activityId,
            groupCode: subActivity.groupCode,
            activityCode: subActivity.activityCode,
            name: subActivity.name,
            description: subActivity.description,
            includedWorks: joinTextList(subActivity.includedWorks),
            excludedWorks: joinTextList(subActivity.excludedWorks),
            relatedActivities: joinTextList(subActivity.relatedActivities),
            version: "france-assureurs-2019",
            isActive: true,
          },
        })
      }
    })().catch((error) => {
      if (isSchemaDriftError(error)) {
        // Dégradé temporaire: on retombe sur la nomenclature canonique en mémoire.
        return
      }
      seedPromise = null
      throw error
    })
  }

  await seedPromise
}

function toNodeRef(code: string, name: string): ActivityNodeRef {
  return { code, name }
}

function scoreAlias(
  normalizedInput: string,
  aliases: string[],
  targetCode: string
): number {
  let best = 0
  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias)
    const score = textSimilarity(normalizedInput, normalizedAlias)
    if (score > best) best = score
  }
  const globalAlias = Object.entries(GLOBAL_ALIASES).find(([, code]) => code === targetCode)
  if (globalAlias?.length) {
    const [alias] = globalAlias
    best = Math.max(best, textSimilarity(normalizedInput, normalizeText(alias)))
  }
  return best
}

function computeBestCandidate(
  input: string,
  store: HierarchyStore
): CandidateScore | null {
  const normalizedInput = normalizeText(input)
  if (!normalizedInput) return null

  const groupByCode = new Map(store.groups.map((group) => [group.code, group]))
  const activityByCode = new Map(store.activities.map((activity) => [activity.code, activity]))

  let best: CandidateScore | null = null

  const setBest = (candidate: CandidateScore) => {
    if (!best || candidate.score > best.score) best = candidate
  }

  for (const group of store.groups) {
    const score = Math.max(
      textSimilarity(normalizedInput, normalizeText(group.code)),
      textSimilarity(normalizedInput, normalizeText(group.name))
    )
    if (score >= 0.42) {
      setBest({
        kind: "group",
        score,
        group: toNodeRef(group.code, group.name),
      })
    }
  }

  for (const activity of store.activities) {
    const group = groupByCode.get(activity.groupCode)
    if (!group) continue
    const score = Math.max(
      textSimilarity(normalizedInput, normalizeText(activity.code)),
      textSimilarity(normalizedInput, normalizeText(activity.name)),
      scoreAlias(normalizedInput, activity.relatedActivities, activity.code)
    )
    if (score >= 0.46) {
      setBest({
        kind: "activity",
        score,
        group: toNodeRef(group.code, group.name),
        activity: toNodeRef(activity.code, activity.name),
      })
    }
  }

  for (const subActivity of store.subActivities) {
    const activity = activityByCode.get(subActivity.activityCode)
    if (!activity) continue
    const group = groupByCode.get(subActivity.groupCode || activity.groupCode)
    if (!group) continue
    const score = Math.max(
      textSimilarity(normalizedInput, normalizeText(subActivity.code)),
      textSimilarity(normalizedInput, normalizeText(subActivity.name)),
      scoreAlias(normalizedInput, subActivity.aliases, subActivity.code)
    )
    if (score >= 0.5) {
      setBest({
        kind: "subActivity",
        score,
        group: toNodeRef(group.code, group.name),
        activity: toNodeRef(activity.code, activity.name),
        subActivity: toNodeRef(subActivity.code, subActivity.name),
      })
    }
  }

  const globalAliasTargetCode = GLOBAL_ALIASES[normalizedInput]
  if (globalAliasTargetCode) {
    const sub = store.subActivities.find((item) => item.code === globalAliasTargetCode)
    if (sub) {
      const activity = activityByCode.get(sub.activityCode)
      const group = activity ? groupByCode.get(activity.groupCode) : null
      if (activity && group) {
        setBest({
          kind: "subActivity",
          score: 0.92,
          group: toNodeRef(group.code, group.name),
          activity: toNodeRef(activity.code, activity.name),
          subActivity: toNodeRef(sub.code, sub.name),
        })
      }
    } else {
      const activity = activityByCode.get(globalAliasTargetCode)
      if (activity) {
        const group = groupByCode.get(activity.groupCode)
        if (group) {
          setBest({
            kind: "activity",
            score: 0.9,
            group: toNodeRef(group.code, group.name),
            activity: toNodeRef(activity.code, activity.name),
          })
        }
      }
    }
  }

  return best
}

function averageConfidence(scores: number[]): number {
  if (!scores.length) return 0
  const total = scores.reduce((sum, value) => sum + value, 0)
  return Number((total / scores.length).toFixed(4))
}

function toMissingSuggestion(candidate: CandidateScore | null): Omit<MissingHierarchyActivity, "input"> {
  if (!candidate) return { confidence: 0 }
  return {
    suggestedGroup: candidate.group,
    suggestedActivity: candidate.activity,
    suggestedSubActivity: candidate.subActivity,
    confidence: Number(candidate.score.toFixed(4)),
  }
}

async function persistUnmatchedActivities(
  unmatched: MissingHierarchyActivity[],
  userId?: string
): Promise<void> {
  if (!unmatched.length) return
  try {
    for (const missing of unmatched) {
      if (userId) {
        await prisma.missingSubActivity.upsert({
          where: {
            userId_userInput: {
              userId,
              userInput: missing.input,
            },
          },
          create: {
            userId,
            userInput: missing.input,
            suggestedGroupCode: missing.suggestedGroup?.code,
            suggestedGroupName: missing.suggestedGroup?.name,
            suggestedActivityCode: missing.suggestedActivity?.code,
            suggestedActivityName: missing.suggestedActivity?.name,
            suggestedSubActivityCode: missing.suggestedSubActivity?.code,
            suggestedSubActivityName: missing.suggestedSubActivity?.name,
            confidence: missing.confidence || null,
          },
          update: {
            suggestedGroupCode: missing.suggestedGroup?.code,
            suggestedGroupName: missing.suggestedGroup?.name,
            suggestedActivityCode: missing.suggestedActivity?.code,
            suggestedActivityName: missing.suggestedActivity?.name,
            suggestedSubActivityCode: missing.suggestedSubActivity?.code,
            suggestedSubActivityName: missing.suggestedSubActivity?.name,
            confidence: missing.confidence || null,
            occurrenceCount: { increment: 1 },
            lastSeenAt: new Date(),
          },
        })
        continue
      }

      await prisma.missingSubActivity.create({
        data: {
          userInput: missing.input,
          suggestedGroupCode: missing.suggestedGroup?.code,
          suggestedGroupName: missing.suggestedGroup?.name,
          suggestedActivityCode: missing.suggestedActivity?.code,
          suggestedActivityName: missing.suggestedActivity?.name,
          suggestedSubActivityCode: missing.suggestedSubActivity?.code,
          suggestedSubActivityName: missing.suggestedSubActivity?.name,
          confidence: missing.confidence || null,
        },
      })
    }
  } catch (error) {
    if (isSchemaDriftError(error)) return
    throw error
  }
}

export async function resolveUserActivitiesHierarchy(
  inputs: string[],
  options: ResolveOptions = {}
): Promise<ActivityHierarchyResolution> {
  if (!options.skipSeed) {
    await ensureActivityHierarchySeeded()
  }

  const store = await loadHierarchyStore()
  const normalizedInputs = inputs
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  const selectionsMap = new Map<string, ActivityHierarchySelection>()
  const unmatched: MissingHierarchyActivity[] = []
  const confidenceScores: number[] = []

  for (const input of normalizedInputs) {
    const candidate = computeBestCandidate(input, store)
    if (!candidate || candidate.score < 0.42) {
      const suggestion = toMissingSuggestion(candidate)
      unmatched.push({
        input,
        ...suggestion,
      })
      continue
    }

    const selection: ActivityHierarchySelection = {
      input,
      confidence: Number(candidate.score.toFixed(4)),
      group: candidate.group,
      activity: candidate.activity,
      subActivity: candidate.subActivity,
    }
    confidenceScores.push(candidate.score)
    const key = selection.subActivity?.code ?? selection.activity?.code ?? selection.group.code
    const existing = selectionsMap.get(key)
    if (!existing || selection.confidence > existing.confidence) {
      selectionsMap.set(key, selection)
    }
  }

  const selections = [...selectionsMap.values()].sort((a, b) => {
    const codeA = a.subActivity?.code ?? a.activity?.code ?? a.group.code
    const codeB = b.subActivity?.code ?? b.activity?.code ?? b.group.code
    return compareCodes(codeA, codeB)
  })

  await persistUnmatchedActivities(unmatched, options.userId)

  const guaranteedHierarchyLines = buildHierarchyLinesFromSelections(selections)
  const guaranteedActivitiesFlat = buildFlatActivityLabels(selections)
  return {
    selections,
    unmatched,
    guaranteedHierarchyLines,
    guaranteedActivitiesFlat,
    guaranteedHierarchyText: guaranteedHierarchyLines.join("\n"),
    confidence: averageConfidence(confidenceScores),
  }
}

export async function searchActivityHierarchy(
  rawTerm: string,
  options: SearchOptions = {}
): Promise<ActivityHierarchySelection[]> {
  const term = rawTerm.trim()
  if (term.length < 2) return []

  await ensureActivityHierarchySeeded()
  const store = await loadHierarchyStore()
  const normalizedTerm = normalizeText(term)
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50))

  const candidates: ActivityHierarchySelection[] = []
  const seen = new Set<string>()

  for (const sub of store.subActivities) {
    const score = Math.max(
      textSimilarity(normalizedTerm, normalizeText(sub.code)),
      textSimilarity(normalizedTerm, normalizeText(sub.name)),
      scoreAlias(normalizedTerm, sub.aliases, sub.code)
    )
    if (score < 0.4) continue

    const activity = store.activities.find((item) => item.code === sub.activityCode)
    if (!activity) continue
    const group = store.groups.find((item) => item.code === activity.groupCode)
    if (!group) continue
    const key = `sub:${sub.code}`
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push({
      input: term,
      confidence: Number(score.toFixed(4)),
      group: toNodeRef(group.code, group.name),
      activity: toNodeRef(activity.code, activity.name),
      subActivity: toNodeRef(sub.code, sub.name),
    })
  }

  for (const activity of store.activities) {
    const score = Math.max(
      textSimilarity(normalizedTerm, normalizeText(activity.code)),
      textSimilarity(normalizedTerm, normalizeText(activity.name)),
      scoreAlias(normalizedTerm, activity.relatedActivities, activity.code)
    )
    if (score < 0.4) continue
    const group = store.groups.find((item) => item.code === activity.groupCode)
    if (!group) continue
    const key = `activity:${activity.code}`
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push({
      input: term,
      confidence: Number(score.toFixed(4)),
      group: toNodeRef(group.code, group.name),
      activity: toNodeRef(activity.code, activity.name),
    })
  }

  for (const group of store.groups) {
    const score = Math.max(
      textSimilarity(normalizedTerm, normalizeText(group.code)),
      textSimilarity(normalizedTerm, normalizeText(group.name))
    )
    if (score < 0.45) continue
    const key = `group:${group.code}`
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push({
      input: term,
      confidence: Number(score.toFixed(4)),
      group: toNodeRef(group.code, group.name),
    })
  }

  return candidates
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence
      const codeA = a.subActivity?.code ?? a.activity?.code ?? a.group.code
      const codeB = b.subActivity?.code ?? b.activity?.code ?? b.group.code
      return compareCodes(codeA, codeB)
    })
    .slice(0, limit)
}
