import "server-only"
import { prisma } from "@/lib/prisma"
import {
  ACTIVITE_EXCLUSIONS,
  ACTIVITE_TO_NOMENCLATURE,
  CATEGORIE_LABELS,
  type NomenclatureItem,
} from "@/lib/nomenclature-activites"

export type ActivityDefinition = {
  code: string
  name: string
  definition: string
  includedWorks: string[]
  excludedWorks: string[]
  relatedActivities: string[]
  isAccessoryAllowed: boolean
}

export type ActivityMatch = {
  code: string
  name: string
  definition: string
  includedWorks: string[]
  excludedWorks: string[]
  relatedActivities: string[]
  isAccessoryAllowed: boolean
  score: number
  confidenceLabel: "high" | "medium" | "low"
  reasons: string[]
}

export type UnmatchedActivity = {
  userInput: string
  suggestedMatch: ActivityMatch | null
}

export type ActivityResolution = {
  matched: ActivityMatch[]
  unmatched: UnmatchedActivity[]
}

const DEFAULT_VERSION = "france-assureurs-2019"

const GROUP_LABELS: Record<string, string> = {
  "1": "Preparation et amenagement du site",
  "2": "Structure et gros oeuvre",
  "3": "Clos et couvert",
  "4": "Divisions - Amenagements - Finitions",
  "5": "Lots techniques et activites specifiques",
  PI: "Professions intellectuelles du batiment",
}

const CODE_DEFINITION_OVERRIDES: Record<string, string> = {
  "1.1": "Travaux de démolition d'ouvrages existants, préparation et sécurisation du site avant reconstruction.",
  "1.2": "Démolition spécialisée avec procédés à risques et protocoles renforcés.",
  "1.3": "Travaux de terrassement, préparation des plateformes, fouilles, remblais et modelage du terrain.",
  "1.6": "Voiries, réseaux divers, assainissement et réseaux techniques associés aux ouvrages.",
  "2.1": "Fondations et parois spéciales participant à la stabilité structurelle des ouvrages.",
  "2.2": "Maçonnerie et béton armé structurels, en construction neuve, rénovation, réparation et renforcement.",
  "2.3": "Ouvrages en béton précontraint in situ, conception d'exécution, mise en œuvre et reprise.",
  "2.4": "Charpente et structure en bois : conception d'exécution, pose, réparation et renforcement.",
  "2.5": "Constructions à ossature bois et éléments structurels associés.",
  "2.6": "Charpente et structure métallique, assemblage et fixation structurelle.",
  "3.1": "Travaux de couverture assurant clos et couvert, protection durable des ouvrages et évacuation des eaux.",
  "3.2": "Travaux d'étanchéité de toitures, terrasses et planchers intérieurs.",
  "3.4": "Revêtements de façades, enduits, ravalement, réparation et entretien de protection de façade.",
  "4.1": "Menuiseries intérieures, mise en œuvre et adaptation technique des éléments d'aménagement.",
  "4.4": "Plâtrerie, cloisons, doublages et plafonds intérieurs concourant à la destination des locaux.",
  "4.7": "Travaux de peinture technique et finition de protection des supports.",
  "4.9": "Revêtements de sols durs, chapes et sols coulés.",
  "5.1": "Installations de plomberie sanitaire, réseaux de distribution et évacuation.",
  "5.2": "Installations de chauffage et réseaux thermiques bâtiment.",
  "5.4": "Installations d'aéraulique, climatisation et conditionnement d'air.",
  "5.5": "Installations électriques et télécommunications intégrées au bâtiment.",
}

const SYNONYMS: Record<string, string> = {
  "dalle beton": "2.2",
  "dalles beton": "2.2",
  "chape beton": "2.2",
  "coffrage beton": "2.2",
  "beton arme": "2.2",
  "maconnerie": "2.2",
  "gros oeuvre": "2.2",
  toiture: "3.1",
  "toiture terrasse": "3.2",
  couvreur: "3.1",
  placo: "4.4",
  placoplâtre: "4.4",
  platrerie: "4.4",
  clim: "5.4",
  climatisation: "5.4",
  aeraulique: "5.4",
  cvc: "5.4",
  plomberie: "5.1",
  electricite: "5.5",
  elec: "5.5",
  terrassement: "1.3",
  bardage: "3.6",
  ravalement: "3.4",
  etancheite: "3.2",
  menuiserie: "4.1",
  carrelage: "4.9",
  peinture: "4.7",
  vrd: "1.6",
}

function firstSentence(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (!normalized) return ""
  const idx = normalized.search(/[.!?]/)
  if (idx < 0) return normalized
  return normalized.slice(0, idx + 1)
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s.-]+/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
}

function confidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 85) return "high"
  if (score >= 60) return "medium"
  return "low"
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  const delimited = raw
    .split("||")
    .map((v) => v.trim())
    .filter(Boolean)
  if (delimited.length > 0) return delimited
  try {
    const p = JSON.parse(raw) as unknown
    if (!Array.isArray(p)) return []
    return p.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean)
  } catch {
    return []
  }
}

function buildFallbackDefinition(item: NomenclatureItem): string {
  const catLabel = CATEGORIE_LABELS[item.categorie] ?? "Nomenclature BTP"
  return `Travaux relevant du code ${item.code} (${item.libelleOfficiel}) selon la nomenclature France Assureurs 2019, incluant conception d'exécution, mise en œuvre, réparation et entretien dans le périmètre assuré. Catégorie : ${catLabel}.`
}

function groupCodeFromActivityCode(code: string): string {
  if (code.startsWith("PI")) return "PI"
  const head = code.split(".")[0]?.trim()
  return head && head.length > 0 ? head : "PI"
}

function groupLabelFromCode(code: string): string {
  return GROUP_LABELS[code] ?? `Groupe ${code}`
}

function buildCanonicalActivities(): ActivityDefinition[] {
  const byCode = new Map<
    string,
    {
      name: string
      category: string
      includedWorks: Set<string>
      excludedWorks: Set<string>
      relatedActivities: Set<string>
    }
  >()

  for (const [siteActivity, mappings] of Object.entries(ACTIVITE_TO_NOMENCLATURE)) {
    for (const mapping of mappings) {
      const current = byCode.get(mapping.code) ?? {
        name: mapping.libelleOfficiel,
        category: mapping.categorie,
        includedWorks: new Set<string>(),
        excludedWorks: new Set<string>(),
        relatedActivities: new Set<string>(),
      }

      current.includedWorks.add(siteActivity)
      for (const excl of ACTIVITE_EXCLUSIONS[siteActivity] ?? []) {
        current.excludedWorks.add(excl)
      }
      for (const rel of mappings) {
        if (rel.code !== mapping.code) {
          current.relatedActivities.add(rel.code)
        }
      }
      byCode.set(mapping.code, current)
    }
  }

  return [...byCode.entries()]
    .map(([code, value]) => {
      const definition = CODE_DEFINITION_OVERRIDES[code] ?? buildFallbackDefinition({
        code,
        libelleOfficiel: value.name,
        categorie: value.category as NomenclatureItem["categorie"],
      })
      return {
        code,
        name: value.name,
        definition,
        includedWorks: [...value.includedWorks].sort((a, b) => a.localeCompare(b)),
        excludedWorks: [...value.excludedWorks].sort((a, b) => a.localeCompare(b)),
        relatedActivities: [...value.relatedActivities].sort((a, b) => a.localeCompare(b)),
        isAccessoryAllowed: value.category !== "professions-intellectuelles",
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code, "fr"))
}

async function ensureCanonicalActivitiesSeeded(): Promise<void> {
  const canonicalActivities = buildCanonicalActivities()
  const count = await prisma.activity.count({
    where: { version: DEFAULT_VERSION },
  })
  if (count >= canonicalActivities.length) return
  await prisma.$transaction(
    canonicalActivities.map((activity) => {
      const groupCode = groupCodeFromActivityCode(activity.code)
      return prisma.activity.upsert({
        where: { code: activity.code },
        update: {
          groupCode,
          group: { connect: { code: groupCode } },
          name: activity.name,
          definition: activity.definition,
          includedWorks: JSON.stringify(activity.includedWorks),
          excludedWorks: JSON.stringify(activity.excludedWorks),
          relatedActivities: JSON.stringify(activity.relatedActivities),
          isAccessoryAllowed: activity.isAccessoryAllowed,
          isActive: true,
          version: DEFAULT_VERSION,
        },
        create: {
          groupCode,
          group: {
            connectOrCreate: {
              where: { code: groupCode },
              create: {
                code: groupCode,
                name: groupLabelFromCode(groupCode),
                definition: groupLabelFromCode(groupCode),
                version: DEFAULT_VERSION,
                isActive: true,
              },
            },
          },
          code: activity.code,
          name: activity.name,
          definition: activity.definition,
          includedWorks: JSON.stringify(activity.includedWorks),
          excludedWorks: JSON.stringify(activity.excludedWorks),
          relatedActivities: JSON.stringify(activity.relatedActivities),
          isAccessoryAllowed: activity.isAccessoryAllowed,
          version: DEFAULT_VERSION,
          isActive: true,
        },
      })
    })
  )
}

export async function getActiveActivities(): Promise<ActivityDefinition[]> {
  await ensureCanonicalActivitiesSeeded()
  const rows = await prisma.activity.findMany({
    where: { isActive: true, version: DEFAULT_VERSION },
    orderBy: [{ code: "asc" }],
  })
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    definition: row.definition,
    includedWorks: parseJsonArray(row.includedWorks),
    excludedWorks: parseJsonArray(row.excludedWorks),
    relatedActivities: parseJsonArray(row.relatedActivities),
    isAccessoryAllowed: row.isAccessoryAllowed,
  }))
}

function scoreAgainstActivity(
  userInput: string,
  activity: ActivityDefinition
): { score: number; reasons: string[] } {
  const normalizedInput = normalizeText(userInput)
  const tokens = tokenize(userInput)
  const reasons: string[] = []
  let score = 0

  const synonymCode = SYNONYMS[normalizedInput]
  if (synonymCode && synonymCode === activity.code) {
    score += 75
    reasons.push("synonyme métier reconnu")
  }
  for (const token of tokens) {
    const tokenSynonymCode = SYNONYMS[token]
    if (tokenSynonymCode && tokenSynonymCode === activity.code) {
      score += 55
      reasons.push(`synonyme sur mot-clé (${token})`)
      break
    }
  }
  for (const [synonym, mappedCode] of Object.entries(SYNONYMS)) {
    if (mappedCode !== activity.code) continue
    if (normalizedInput.includes(synonym)) {
      score += 55
      reasons.push("expression synonyme reconnue")
      break
    }
  }

  if (normalizedInput === normalizeText(activity.name)) {
    score += 80
    reasons.push("libellé exact")
  } else if (normalizeText(activity.name).includes(normalizedInput) || normalizedInput.includes(normalizeText(activity.name))) {
    score += 45
    reasons.push("proximité sur le libellé activité")
  }

  const definitionText = normalizeText(activity.definition)
  const includedText = normalizeText(activity.includedWorks.join(" "))
  const relatedText = normalizeText(activity.relatedActivities.join(" "))

  for (const token of tokens) {
    if (definitionText.includes(token)) score += 8
    if (includedText.includes(token)) score += 10
    if (relatedText.includes(token)) score += 4
  }

  if (score > 0 && reasons.length === 0) {
    reasons.push("similarité textuelle")
  }
  return { score: Math.min(score, 100), reasons }
}

function activityToMatch(activity: ActivityDefinition, score: number, reasons: string[]): ActivityMatch {
  return {
    code: activity.code,
    name: activity.name,
    definition: activity.definition,
    includedWorks: activity.includedWorks,
    excludedWorks: activity.excludedWorks,
    relatedActivities: activity.relatedActivities,
    isAccessoryAllowed: activity.isAccessoryAllowed,
    score,
    confidenceLabel: confidenceLabel(score),
    reasons,
  }
}

async function recordMissingActivity(
  userInput: string,
  suggestedMatch: ActivityMatch | null,
  userId?: string
): Promise<void> {
  const normalized = normalizeText(userInput)
  if (!normalized) return
  const existing = await prisma.missingSubActivity.findFirst({
    where: userId ? { userId, userInput: normalized } : { userInput: normalized },
    select: { id: true, occurrenceCount: true },
  })
  const suggestedGroupCode = suggestedMatch ? groupCodeFromActivityCode(suggestedMatch.code) : null
  const suggestedGroupName = suggestedGroupCode ? groupLabelFromCode(suggestedGroupCode) : null
  if (existing) {
    await prisma.missingSubActivity.update({
      where: { id: existing.id },
      data: {
        occurrenceCount: existing.occurrenceCount + 1,
        lastSeenAt: new Date(),
        suggestedGroupCode,
        suggestedGroupName,
        suggestedActivityCode: suggestedMatch?.code ?? null,
        suggestedActivityName: suggestedMatch?.name ?? null,
        ...(userId ? { userId } : {}),
      },
    })
    return
  }
  await prisma.missingSubActivity.create({
    data: {
      userId,
      userInput: normalized,
      suggestedGroupCode,
      suggestedGroupName,
      suggestedActivityCode: suggestedMatch?.code ?? null,
      suggestedActivityName: suggestedMatch?.name ?? null,
      confidence: suggestedMatch?.score ?? null,
      validated: false,
    },
  })
}

export async function resolveUserActivities(
  rawInputs: string[],
  opts?: { minScore?: number; userId?: string }
): Promise<ActivityResolution> {
  const activities = await getActiveActivities()
  const minScore = opts?.minScore ?? 60
  const matchedByCode = new Map<string, ActivityMatch>()
  const unmatched: UnmatchedActivity[] = []

  for (const input of rawInputs.map((v) => v.trim()).filter(Boolean)) {
    let best: ActivityMatch | null = null
    for (const activity of activities) {
      const scored = scoreAgainstActivity(input, activity)
      if (scored.score <= 0) continue
      const candidate = activityToMatch(activity, scored.score, scored.reasons)
      if (!best || candidate.score > best.score) {
        best = candidate
      }
    }

    if (best && best.score >= minScore) {
      const existing = matchedByCode.get(best.code)
      if (!existing || best.score > existing.score) {
        matchedByCode.set(best.code, best)
      }
      continue
    }

    await recordMissingActivity(input, best, opts?.userId)
    unmatched.push({ userInput: input, suggestedMatch: best })
  }

  return {
    matched: [...matchedByCode.values()].sort((a, b) => a.code.localeCompare(b.code)),
    unmatched,
  }
}

export function summarizeGuaranteedActivities(matches: ActivityMatch[]): string[] {
  return matches.map((m) => `${m.code} ${m.name} : ${firstSentence(m.definition)}`)
}

export function buildOutOfNomenclatureAlerts(unmatched: UnmatchedActivity[]): string[] {
  return unmatched.map((item) => {
    const suggested =
      item.suggestedMatch != null
        ? ` Activité proche suggérée : ${item.suggestedMatch.code} ${item.suggestedMatch.name} (${item.suggestedMatch.score}%).`
        : ""
    return `Cette activité n’est pas couverte faute de correspondance nomenclature : "${item.userInput}".${suggested}`
  })
}

export async function searchActivities(query: string, limit = 8): Promise<ActivityMatch[]> {
  const activities = await getActiveActivities()
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return []
  const ranked = activities
    .map((activity) => {
      const scored = scoreAgainstActivity(normalizedQuery, activity)
      return activityToMatch(activity, scored.score, scored.reasons)
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
  return ranked.slice(0, Math.max(1, limit))
}

export function parseStoredActivityLines(raw: string | null | undefined): string[] {
  return parseJsonArray(raw)
}

export function summarizeGuaranteedActivitiesFromStoredActivityNames(
  activityNames: string[]
): string[] {
  const normalizedMap = new Map<string, string>()
  for (const activity of activityNames) {
    const raw = activity.trim()
    if (!raw) continue
    const noBullet = raw.replace(/^-+\s*/, "")
    const parts = noBullet.split(":")
    const left = parts[0]?.trim() || noBullet
    const codeMatch = left.match(/^(\d+\.\d+)\s+(.+)$/)
    if (codeMatch) {
      const code = codeMatch[1]
      const name = codeMatch[2].trim()
      const definition =
        CODE_DEFINITION_OVERRIDES[code] ?? "Activité couverte selon la nomenclature France Assureurs 2019."
      normalizedMap.set(code, `${code} ${name} : ${definition}`)
      continue
    }
    const code = SYNONYMS[normalizeText(noBullet)]
    if (code) {
      const inferredName = noBullet
      const definition =
        CODE_DEFINITION_OVERRIDES[code] ?? "Activité couverte selon la nomenclature France Assureurs 2019."
      normalizedMap.set(code, `${code} ${inferredName} : ${definition}`)
      continue
    }
    normalizedMap.set(noBullet.toLowerCase(), noBullet)
  }
  return [...normalizedMap.values()]
}

export async function summarizeGuaranteedActivitiesFromContract(
  activitiesJson: string | null | undefined
): Promise<string[]> {
  const rawInputs = parseJsonArray(activitiesJson)
  if (rawInputs.length === 0) return []
  const byStored = summarizeGuaranteedActivitiesFromStoredActivityNames(rawInputs)
  if (byStored.length > 0) return byStored
  const resolution = await resolveUserActivities(rawInputs, { minScore: 60 })
  return summarizeGuaranteedActivities(resolution.matched)
}

export async function upsertActivityDefinition(
  input: ActivityDefinition & { version?: string; isActive?: boolean }
): Promise<void> {
  const version = input.version?.trim() || DEFAULT_VERSION
  const groupCode = groupCodeFromActivityCode(input.code)
  await prisma.activity.upsert({
    where: { code: input.code },
    update: {
      groupCode,
      group: { connect: { code: groupCode } },
      name: input.name,
      definition: input.definition,
      includedWorks: JSON.stringify(input.includedWorks),
      excludedWorks: JSON.stringify(input.excludedWorks),
      relatedActivities: JSON.stringify(input.relatedActivities),
      isAccessoryAllowed: input.isAccessoryAllowed,
      version,
      isActive: input.isActive ?? true,
    },
    create: {
      groupCode,
      group: {
        connectOrCreate: {
          where: { code: groupCode },
          create: {
            code: groupCode,
            name: groupLabelFromCode(groupCode),
            definition: groupLabelFromCode(groupCode),
            version,
            isActive: true,
          },
        },
      },
      code: input.code,
      name: input.name,
      definition: input.definition,
      includedWorks: JSON.stringify(input.includedWorks),
      excludedWorks: JSON.stringify(input.excludedWorks),
      relatedActivities: JSON.stringify(input.relatedActivities),
      isAccessoryAllowed: input.isAccessoryAllowed,
      version,
      isActive: input.isActive ?? true,
    },
  })
}

