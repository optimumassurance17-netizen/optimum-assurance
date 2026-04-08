export type RcFabPeriodicity = "mensuel" | "trimestriel" | "semestriel" | "annuel"

export type RcFabPeriodicityMeta = {
  label: string
  installmentsPerYear: number
  monthsStep: number
}

const RC_FAB_PERIODICITY_META: Record<RcFabPeriodicity, RcFabPeriodicityMeta> = {
  mensuel: { label: "Mensuel", installmentsPerYear: 12, monthsStep: 1 },
  trimestriel: { label: "Trimestriel", installmentsPerYear: 4, monthsStep: 3 },
  semestriel: { label: "Semestriel", installmentsPerYear: 2, monthsStep: 6 },
  annuel: { label: "Annuel", installmentsPerYear: 1, monthsStep: 12 },
}

export const RC_FAB_BATTERIES_ACTIVITE = "fabrication de batteries"
export const RC_FAB_BATTERIES_PROTECTION_JURIDIQUE_EUR = 20_000
export const RC_FAB_BATTERIES_PLAFOND_EUR = 2_500_000
export const RC_FAB_BATTERIES_FRANCHISE_EUR = 5_000

export type RcFabDossierConfig = {
  version: "rc_fabriquant_batteries_v1"
  modeEtude: true
  activite: string
  referenceContrat: string
  periodicite: RcFabPeriodicity
  installmentsPerYear: number
  monthsStep: number
  primeAnnuelleHt: number
  primeAnnuelleTtc: number
  montantParEcheanceTtc: number
  protectionJuridique: number
  plafondGlobalParSinistreEtParAn: number
  franchiseParSinistre: number
}

type RcFabConfigEnvelope = {
  rcFabriquantDossierConfig: RcFabDossierConfig
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function isRcFabPeriodicity(value: unknown): value is RcFabPeriodicity {
  return value === "mensuel" || value === "trimestriel" || value === "semestriel" || value === "annuel"
}

export function normalizeRcFabPeriodicity(value: unknown): RcFabPeriodicity {
  return isRcFabPeriodicity(value) ? value : "trimestriel"
}

export function getRcFabPeriodicityMeta(periodicity: RcFabPeriodicity): RcFabPeriodicityMeta {
  return RC_FAB_PERIODICITY_META[periodicity]
}

export function buildRcFabDossierConfig(input: {
  referenceContrat: string
  periodicite: RcFabPeriodicity
  primeAnnuelleTtc: number
  primeAnnuelleHt?: number | null
}): RcFabDossierConfig {
  const periodicite = normalizeRcFabPeriodicity(input.periodicite)
  const meta = getRcFabPeriodicityMeta(periodicite)
  const primeAnnuelleTtc = roundMoney(Math.max(0, input.primeAnnuelleTtc))
  const inferredHt = roundMoney(primeAnnuelleTtc / 1.2)
  const primeAnnuelleHt = roundMoney(
    Math.max(0, Number.isFinite(input.primeAnnuelleHt ?? NaN) ? Number(input.primeAnnuelleHt) : inferredHt)
  )
  const montantParEcheanceTtc =
    meta.installmentsPerYear > 0
      ? roundMoney(primeAnnuelleTtc / meta.installmentsPerYear)
      : primeAnnuelleTtc

  return {
    version: "rc_fabriquant_batteries_v1",
    modeEtude: true,
    activite: RC_FAB_BATTERIES_ACTIVITE,
    referenceContrat: input.referenceContrat.trim() || "RCFAB",
    periodicite,
    installmentsPerYear: meta.installmentsPerYear,
    monthsStep: meta.monthsStep,
    primeAnnuelleHt,
    primeAnnuelleTtc,
    montantParEcheanceTtc,
    protectionJuridique: RC_FAB_BATTERIES_PROTECTION_JURIDIQUE_EUR,
    plafondGlobalParSinistreEtParAn: RC_FAB_BATTERIES_PLAFOND_EUR,
    franchiseParSinistre: RC_FAB_BATTERIES_FRANCHISE_EUR,
  }
}

export function serializeRcFabDossierConfig(config: RcFabDossierConfig): string {
  const envelope: RcFabConfigEnvelope = { rcFabriquantDossierConfig: config }
  return JSON.stringify(envelope)
}

function parseConfigEnvelope(raw: string | null | undefined): RcFabDossierConfig | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    const cfgRaw = (parsed as { rcFabriquantDossierConfig?: unknown }).rcFabriquantDossierConfig
    if (!cfgRaw || typeof cfgRaw !== "object" || Array.isArray(cfgRaw)) return null
    const c = cfgRaw as Partial<RcFabDossierConfig>
    const periodicite = normalizeRcFabPeriodicity(c.periodicite)
    const meta = getRcFabPeriodicityMeta(periodicite)
    const primeAnnuelleTtc =
      typeof c.primeAnnuelleTtc === "number" && Number.isFinite(c.primeAnnuelleTtc)
        ? roundMoney(Math.max(0, c.primeAnnuelleTtc))
        : 0
    const primeAnnuelleHt =
      typeof c.primeAnnuelleHt === "number" && Number.isFinite(c.primeAnnuelleHt)
        ? roundMoney(Math.max(0, c.primeAnnuelleHt))
        : roundMoney(primeAnnuelleTtc / 1.2)
    const installmentsPerYear =
      typeof c.installmentsPerYear === "number" && Number.isFinite(c.installmentsPerYear) && c.installmentsPerYear > 0
        ? Math.max(1, Math.round(c.installmentsPerYear))
        : meta.installmentsPerYear
    const monthsStep =
      typeof c.monthsStep === "number" && Number.isFinite(c.monthsStep) && c.monthsStep > 0
        ? Math.max(1, Math.round(c.monthsStep))
        : meta.monthsStep
    const montantParEcheanceTtc =
      typeof c.montantParEcheanceTtc === "number" && Number.isFinite(c.montantParEcheanceTtc)
        ? roundMoney(Math.max(0, c.montantParEcheanceTtc))
        : installmentsPerYear > 0
          ? roundMoney(primeAnnuelleTtc / installmentsPerYear)
          : primeAnnuelleTtc
    return {
      version: "rc_fabriquant_batteries_v1",
      modeEtude: true,
      activite: RC_FAB_BATTERIES_ACTIVITE,
      referenceContrat:
        typeof c.referenceContrat === "string" && c.referenceContrat.trim()
          ? c.referenceContrat.trim()
          : "RCFAB",
      periodicite,
      installmentsPerYear,
      monthsStep,
      primeAnnuelleHt,
      primeAnnuelleTtc,
      montantParEcheanceTtc,
      protectionJuridique: RC_FAB_BATTERIES_PROTECTION_JURIDIQUE_EUR,
      plafondGlobalParSinistreEtParAn: RC_FAB_BATTERIES_PLAFOND_EUR,
      franchiseParSinistre: RC_FAB_BATTERIES_FRANCHISE_EUR,
    }
  } catch {
    return null
  }
}

export function hasRcFabDossierConfig(rawExclusionsJson: string | null | undefined): boolean {
  return parseConfigEnvelope(rawExclusionsJson) != null
}

export function readRcFabDossierConfig(
  rawExclusionsJson: string | null | undefined,
  fallbackPremiumPerInstallmentTtc: number,
  referenceContrat: string
): RcFabDossierConfig {
  const existing = parseConfigEnvelope(rawExclusionsJson)
  if (existing) return existing
  const primePerTerm = roundMoney(Math.max(0, fallbackPremiumPerInstallmentTtc))
  const primeAnnuelleTtc = roundMoney(primePerTerm * 4)
  return buildRcFabDossierConfig({
    referenceContrat,
    periodicite: "trimestriel",
    primeAnnuelleTtc,
    primeAnnuelleHt: roundMoney(primeAnnuelleTtc / 1.2),
  })
}
