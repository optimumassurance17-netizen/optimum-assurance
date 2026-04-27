import { prisma } from "@/lib/prisma"

export const DDA_LEGAL_VERSION = "DDA-FR-2026.04"

export type DdaProduct = "decennale" | "dommage-ouvrage" | "rc-fabriquant"
export type DdaSourcePage =
  | "souscription"
  | "souscription_do"
  | "signature"
  | "formulaire_do"
  | "paiement_do"
  | "rc_fabriquant_result"

type DdaAuditLog = { id: string; acceptedAt: Date; page: string; produit: string }

type DdaAssertResult =
  | { ok: true; logId: string; log: DdaAuditLog }
  | { ok: false; reason: string }

type BuildDdaNeedSummaryInput = {
  insuranceProduct?: "decennale" | "do" | "rc_fabriquant"
  companyName?: string
  projectName?: string
  projectAddress?: string
  activitiesCount?: number
  turnover?: number | null
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function productVariants(product: DdaProduct): string[] {
  if (product === "decennale") return ["decennale"]
  if (product === "dommage-ouvrage") return ["dommage-ouvrage", "dommage_ouvrage", "do"]
  return ["rc-fabriquant", "rc_fabriquant"]
}

function normalizePageUnsafe(value: unknown): DdaSourcePage | null {
  const raw = asTrimmedString(value)?.toLowerCase()
  if (!raw) return null
  if (raw === "souscription") return "souscription"
  if (raw === "souscription_do") return "souscription_do"
  if (raw === "signature") return "signature"
  if (raw === "formulaire_do") return "formulaire_do"
  if (raw === "paiement_do") return "paiement_do"
  if (raw === "rc_fabriquant_result") return "rc_fabriquant_result"
  return null
}

function formatEuros(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} €`
}

async function findRecentConsent(params: {
  userId?: string | null
  email?: string | null
  product: DdaProduct
  maxAgeHours: number
  allowedPages: DdaSourcePage[]
}): Promise<DdaAuditLog | null> {
  const userId = asTrimmedString(params.userId)
  const email = asTrimmedString(params.email)?.toLowerCase()
  if (!userId && !email) return null

  const minDate = new Date(Date.now() - params.maxAgeHours * 60 * 60 * 1000)
  const identityConditions: Array<Record<string, string>> = []
  if (userId) identityConditions.push({ userId })
  if (email) identityConditions.push({ email })

  return prisma.devoirConseilLog.findFirst({
    where: {
      produit: { in: productVariants(params.product) },
      page: { in: params.allowedPages },
      acceptedAt: { gte: minDate },
      OR: identityConditions,
    },
    select: { id: true, acceptedAt: true, page: true, produit: true },
    orderBy: { acceptedAt: "desc" },
  })
}

export function normalizeDdaProduct(value: unknown): DdaProduct | null {
  const raw = asTrimmedString(value)?.toLowerCase()
  if (!raw) return null
  if (raw === "decennale") return "decennale"
  if (raw === "dommage-ouvrage" || raw === "dommage_ouvrage" || raw === "do") return "dommage-ouvrage"
  if (raw === "rc-fabriquant" || raw === "rc_fabriquant") return "rc-fabriquant"
  return null
}

export function normalizeDdaSourcePage(value: unknown): DdaSourcePage | null {
  return normalizePageUnsafe(value)
}

/** Compat ancien nom */
export function normalizeDdaPage(value: unknown): DdaSourcePage | null {
  return normalizePageUnsafe(value)
}

export async function hasRecentDdaConsent(params: {
  userId?: string | null
  email?: string | null
  product: DdaProduct
  pages: DdaSourcePage[]
  withinHours: number
}): Promise<boolean> {
  const log = await findRecentConsent({
    userId: params.userId,
    email: params.email,
    product: params.product,
    allowedPages: params.pages,
    maxAgeHours: params.withinHours,
  })
  return Boolean(log)
}

export async function assertRecentDdaConsent(
  userId: string | null | undefined,
  produit: DdaProduct | null,
  maxAgeHours: number
): Promise<DdaAssertResult>
export async function assertRecentDdaConsent(params: {
  userId?: string | null
  email?: string | null
  produit: DdaProduct | null
  maxAgeHours?: number
  allowedPages?: DdaSourcePage[]
}): Promise<DdaAssertResult>
export async function assertRecentDdaConsent(
  arg1: string | null | undefined | { userId?: string | null; email?: string | null; produit: DdaProduct | null; maxAgeHours?: number; allowedPages?: DdaSourcePage[] },
  arg2?: DdaProduct | null,
  arg3?: number
): Promise<DdaAssertResult> {
  const params =
    typeof arg1 === "object" && arg1 !== null
      ? arg1
      : {
          userId: arg1 ?? null,
          produit: arg2 ?? null,
          maxAgeHours: arg3,
          allowedPages: undefined,
        }
  if (!params.produit) {
    return { ok: false, reason: "Produit DDA invalide" }
  }
  const allowedPages =
    params.allowedPages && params.allowedPages.length
      ? params.allowedPages
      : ([
          "souscription",
          "souscription_do",
          "signature",
          "formulaire_do",
          "paiement_do",
          "rc_fabriquant_result",
        ] satisfies DdaSourcePage[])

  const log = await findRecentConsent({
    userId: params.userId,
    email: params.email,
    product: params.produit,
    allowedPages,
    maxAgeHours: params.maxAgeHours ?? 72,
  })
  if (!log) {
    return {
      ok: false,
      reason: "Validation DDA manquante ou expirée. Merci de confirmer vos exigences et besoins.",
    }
  }
  return { ok: true, logId: log.id, log }
}

/** Compat ancien nom */
export async function ensureRecentDdaConsent(
  userId: string | null | undefined,
  produit: DdaProduct | null,
  maxAgeHours = 72
): Promise<DdaAssertResult> {
  return assertRecentDdaConsent(userId, produit, maxAgeHours)
}

export function buildDdaNeedSummary(input: BuildDdaNeedSummaryInput): string {
  const productLabel =
    input.insuranceProduct === "do"
      ? "dommage-ouvrage"
      : input.insuranceProduct === "rc_fabriquant"
        ? "rc-fabriquant"
        : "decennale"
  const chunks: string[] = [`Produit visé: ${productLabel}`]
  if (input.companyName) chunks.push(`Société: ${input.companyName}`)
  if (typeof input.activitiesCount === "number") chunks.push(`Activités déclarées: ${input.activitiesCount}`)
  if (typeof input.turnover === "number" && Number.isFinite(input.turnover) && input.turnover > 0) {
    chunks.push(`CA déclaré: ${formatEuros(input.turnover)}`)
  }
  if (input.projectName) chunks.push(`Projet: ${input.projectName}`)
  if (input.projectAddress) chunks.push(`Adresse projet: ${input.projectAddress}`)
  return chunks.join(" | ")
}

export function buildDdaNeedsSummary(input: {
  productType: DdaProduct
  clientName: string
  siret?: string
  address?: string
  activities?: string[]
  projectName?: string
  projectAddress?: string
  premium?: number
}): string {
  const chunks: string[] = [`Produit: ${input.productType}`, `Client: ${input.clientName}`]
  if (input.siret) chunks.push(`SIRET: ${input.siret}`)
  if (input.address) chunks.push(`Adresse: ${input.address}`)
  if (input.activities?.length) chunks.push(`Activités: ${input.activities.slice(0, 8).join(", ")}`)
  if (input.projectName) chunks.push(`Projet: ${input.projectName}`)
  if (input.projectAddress) chunks.push(`Adresse projet: ${input.projectAddress}`)
  if (typeof input.premium === "number" && Number.isFinite(input.premium)) chunks.push(`Prime: ${formatEuros(input.premium)}`)
  return chunks.join(" | ")
}

export function buildDdaSuitabilityStatement(input: {
  productType: DdaProduct
  matchedActivities?: string[]
  missingActivitiesCount?: number
  riskReasons?: string[]
  exclusions?: string[]
  sourcePage?: string
}): string {
  const chunks: string[] = [`Adéquation: ${input.productType}`]
  if (input.matchedActivities?.length) chunks.push(`Activités retenues: ${input.matchedActivities.slice(0, 8).join(", ")}`)
  if (typeof input.missingActivitiesCount === "number" && input.missingActivitiesCount > 0) {
    chunks.push(`Activités hors nomenclature: ${input.missingActivitiesCount}`)
  }
  if (input.exclusions?.length) chunks.push(`Exclusions: ${input.exclusions.slice(0, 5).join(" ; ")}`)
  if (input.riskReasons?.length) chunks.push(`Facteurs de risque: ${input.riskReasons.slice(0, 4).join(" ; ")}`)
  if (input.sourcePage) chunks.push(`Source: ${input.sourcePage}`)
  return chunks.join(" | ")
}

export function buildDdaNeedsSnapshot(input: {
  projet: string
  zone?: string
  clientType?: string
  budget?: number
  freeText?: string
}) {
  return {
    version: DDA_LEGAL_VERSION,
    projet: input.projet,
    zone: input.zone ?? "France",
    clientType: input.clientType ?? "professionnel",
    budget: input.budget ?? null,
    freeText: input.freeText ?? "",
    summary: [
      `Projet: ${input.projet}`,
      `Zone: ${input.zone ?? "France"}`,
      input.budget ? `Budget: ${formatEuros(input.budget)}` : null,
      input.freeText ? `Notes: ${input.freeText}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  }
}

export function buildDdaSuitabilitySnapshot(input: {
  produit: DdaProduct
  besoins: ReturnType<typeof buildDdaNeedsSnapshot>
  garanties?: string[]
  exclusions?: string[]
  distributable: boolean
}) {
  const garanties = input.garanties ?? []
  const exclusions = input.exclusions ?? []
  return {
    version: DDA_LEGAL_VERSION,
    produit: input.produit,
    distributable: input.distributable,
    garanties,
    exclusions,
    statement: [
      `Produit retenu: ${input.produit}`,
      `Distribuable: ${input.distributable ? "oui" : "non"}`,
      garanties.length ? `Garanties: ${garanties.join(", ")}` : null,
      exclusions.length ? `Exclusions: ${exclusions.join(", ")}` : null,
      `Besoins: ${input.besoins.summary}`,
    ]
      .filter(Boolean)
      .join(" | "),
  }
}

export function buildDdaLogDetails(body: {
  page?: string
  produit?: string
  sourcePage?: string
  sourcePath?: string
  needsSummary?: string
  needsVersion?: string
  recommendedProduct?: string
  suitabilityScore?: number
  context?: Record<string, unknown>
  contexte?: Record<string, unknown>
}): Record<string, unknown> {
  return {
    version: body.needsVersion || DDA_LEGAL_VERSION,
    page: body.page || null,
    produit: body.produit || null,
    sourcePage: body.sourcePage || null,
    sourcePath: body.sourcePath || null,
    needsSummary: body.needsSummary || null,
    recommendedProduct: body.recommendedProduct || null,
    suitabilityScore:
      typeof body.suitabilityScore === "number" && Number.isFinite(body.suitabilityScore)
        ? body.suitabilityScore
        : null,
    context: body.context ?? body.contexte ?? null,
  }
}

export function computeDdaAdequacySnapshot(
  product: DdaProduct,
  context: Record<string, unknown> | null
): { ok: boolean; missingNeeds: string[]; checks: Record<string, boolean> } {
  const safeContext = context ?? {}
  if (product === "decennale") {
    const checks = {
      hasActivities: asStringArray(safeContext.activities).length > 0,
      hasTurnover: asPositiveNumber(safeContext.chiffreAffaires) != null,
      hasSiret: (asTrimmedString(safeContext.siret) || "").replace(/\D/g, "").length === 14,
    }
    const missingNeeds = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([key]) => key)
    return { ok: missingNeeds.length === 0, missingNeeds, checks }
  }
  if (product === "dommage-ouvrage") {
    const checks = {
      hasProjectName: Boolean(asTrimmedString(safeContext.projectName)),
      hasProjectAddress: Boolean(asTrimmedString(safeContext.projectAddress)),
      hasProjectBudget: asPositiveNumber(safeContext.coutTotal) != null || asPositiveNumber(safeContext.premium) != null,
    }
    const missingNeeds = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([key]) => key)
    return { ok: missingNeeds.length === 0, missingNeeds, checks }
  }
  const checks = {
    hasProductScope:
      asStringArray(safeContext.products).length > 0 ||
      Boolean(asTrimmedString(safeContext.activiteFabrication)),
    hasDistributionZone: Boolean(asTrimmedString(safeContext.zoneDistribution)),
    hasTraceability: Boolean(safeContext.traceability === true || asTrimmedString(safeContext.traceability)),
  }
  const missingNeeds = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key)
  return { ok: missingNeeds.length === 0, missingNeeds, checks }
}
