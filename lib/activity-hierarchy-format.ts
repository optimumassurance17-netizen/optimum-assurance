export type ActivityNodeRef = {
  code: string
  name: string
}

export type ActivityHierarchySelection = {
  input: string
  confidence: number
  group: ActivityNodeRef
  activity?: ActivityNodeRef
  subActivity?: ActivityNodeRef
}

export type MissingHierarchyActivity = {
  input: string
  suggestedGroup?: ActivityNodeRef
  suggestedActivity?: ActivityNodeRef
  suggestedSubActivity?: ActivityNodeRef
  confidence: number
}

export type ActivityHierarchyResolution = {
  selections: ActivityHierarchySelection[]
  unmatched: MissingHierarchyActivity[]
  guaranteedHierarchyLines: string[]
  guaranteedActivitiesFlat: string[]
  guaranteedHierarchyText: string
  confidence: number
}

function normalizeCodeForSort(code: string): number[] {
  return code
    .split(".")
    .map((part) => Number(part))
    .filter((value) => Number.isFinite(value))
}

function compareCodes(a: string, b: string): number {
  const na = normalizeCodeForSort(a)
  const nb = normalizeCodeForSort(b)
  const max = Math.max(na.length, nb.length)
  for (let i = 0; i < max; i += 1) {
    const va = na[i] ?? -1
    const vb = nb[i] ?? -1
    if (va !== vb) return va - vb
  }
  return a.localeCompare(b, "fr")
}

export function formatGroupLine(group: ActivityNodeRef): string {
  return `${group.code} - ${group.name}`
}

export function formatActivityLine(activity: ActivityNodeRef): string {
  return `${activity.code} ${activity.name}`
}

export function formatSubActivityLine(subActivity: ActivityNodeRef): string {
  return `${subActivity.code} ${subActivity.name}`
}

export function buildHierarchyLinesFromSelections(
  selections: ActivityHierarchySelection[]
): string[] {
  const groups = new Map<string, ActivityNodeRef>()
  const activities = new Map<string, ActivityNodeRef>()
  const subActivities = new Map<string, ActivityNodeRef>()

  for (const selection of selections) {
    groups.set(selection.group.code, selection.group)
    if (selection.activity) activities.set(selection.activity.code, selection.activity)
    if (selection.subActivity) subActivities.set(selection.subActivity.code, selection.subActivity)
  }

  const groupLines = [...groups.values()]
    .sort((a, b) => compareCodes(a.code, b.code))
    .map(formatGroupLine)
  const activityLines = [...activities.values()]
    .sort((a, b) => compareCodes(a.code, b.code))
    .map(formatActivityLine)
  const subActivityLines = [...subActivities.values()]
    .sort((a, b) => compareCodes(a.code, b.code))
    .map(formatSubActivityLine)

  return [...groupLines, ...activityLines, ...subActivityLines]
}

export function buildFlatActivityLabels(
  selections: ActivityHierarchySelection[]
): string[] {
  const labels = new Map<string, string>()
  for (const selection of selections) {
    if (selection.subActivity) {
      labels.set(selection.subActivity.code, formatSubActivityLine(selection.subActivity))
      continue
    }
    if (selection.activity) {
      labels.set(selection.activity.code, formatActivityLine(selection.activity))
      continue
    }
    labels.set(selection.group.code, formatGroupLine(selection.group))
  }
  return [...labels.entries()]
    .sort((a, b) => compareCodes(a[0], b[0]))
    .map((entry) => entry[1])
}

export function formatActivitiesForDocuments(
  source:
    | ActivityHierarchyResolution
    | ActivityHierarchySelection[]
    | null
    | undefined
): string {
  const selections = Array.isArray(source)
    ? source
    : source?.selections

  if (!selections?.length) return ""
  return buildHierarchyLinesFromSelections(selections).join("\n")
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

type StructuredDataCandidate = {
  [key: string]: unknown
  activitesStructurees?: unknown
  activitesHierarchie?: unknown
  activitiesStructured?: unknown
  activitiesHierarchy?: unknown
  matchedHierarchy?: unknown
  matchedActivities?: unknown
  activites?: unknown
  activities?: unknown
}

export function extractStructuredActivities(
  value: StructuredDataCandidate | null | undefined
): string[] {
  if (!value) return []
  const candidates = [
    toStringArray(value.activitesStructurees),
    toStringArray(value.activitesHierarchie),
    toStringArray(value.activitiesStructured),
    toStringArray(value.activitiesHierarchy),
    toStringArray(value.matchedHierarchy),
    toStringArray(value.matchedActivities),
    toStringArray(value.activites),
    toStringArray(value.activities),
  ]
  return candidates.find((items) => items.length > 0) ?? []
}
