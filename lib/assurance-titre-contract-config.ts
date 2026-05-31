import {
  ASSURANCE_TITRE_BESOIN_LABELS,
  ASSURANCE_TITRE_BIEN_LABELS,
  ASSURANCE_TITRE_OPERATION_LABELS,
  ASSURANCE_TITRE_RISQUE_LABELS,
  type AssuranceTitreBesoinPrincipal,
  type AssuranceTitreData,
  type AssuranceTitreRisqueIdentifie,
  type AssuranceTitreTypeBien,
  type AssuranceTitreTypeOperation,
} from "@/lib/assurance-titre-types"
import {
  ASSURANCE_TITRE_ETUDE_DOCUMENT_LABELS,
  type AssuranceTitreEtudeQuestionnaireV1,
} from "@/lib/assurance-titre-etude-questionnaire-types"

export type AssuranceTitreContractDossierSnapshot = {
  contactName: string
  structureName?: string
  propertyAddress?: string
  propertyPostalCode?: string
  propertyCity?: string
  operationLabel?: string
  propertyTypeLabel?: string
  needLabel?: string
  capitalAmount?: number
  riskLabels: string[]
  details?: string
  parties: string[]
  availableDocuments: string[]
}

export type AssuranceTitreContractConfig = {
  version: "assurance_titre_dossier_v1"
  modeEtude: true
  productType: "assurance_titre"
  referenceContrat: string
  productLabel: string
  periodicite: "annuel"
  installmentsPerYear: 1
  monthsStep: 12
  primeAnnuelleHt: number
  primeAnnuelleTtc: number
  montantParEcheanceTtc: number
  coverageDurationYears: number
  dossier: AssuranceTitreContractDossierSnapshot
}

type AssuranceTitreConfigEnvelope = {
  assuranceTitreContractConfig: AssuranceTitreContractConfig
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function sanitizeText(value: unknown, maxLength = 240): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value?.trim()) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function parsePositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return roundMoney(value)
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed > 0) {
      return roundMoney(parsed)
    }
  }
  return undefined
}

function uniqueLines(values: unknown[], maxLength = 200): string[] {
  return [...new Set(values.map((value) => sanitizeText(value, maxLength)).filter(Boolean))]
}

function readOperationLabel(value: unknown): string | undefined {
  const key = sanitizeText(value, 80) as AssuranceTitreTypeOperation
  return ASSURANCE_TITRE_OPERATION_LABELS[key]
}

function readPropertyTypeLabel(value: unknown): string | undefined {
  const key = sanitizeText(value, 80) as AssuranceTitreTypeBien
  return ASSURANCE_TITRE_BIEN_LABELS[key]
}

function readNeedLabel(value: unknown): string | undefined {
  const key = sanitizeText(value, 80) as AssuranceTitreBesoinPrincipal
  return ASSURANCE_TITRE_BESOIN_LABELS[key]
}

function readRiskLabels(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return uniqueLines(
    values.map((value) => {
      const key = sanitizeText(value, 80) as AssuranceTitreRisqueIdentifie
      return ASSURANCE_TITRE_RISQUE_LABELS[key] ?? sanitizeText(value, 120)
    }),
    120
  )
}

function readDocumentLabels(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return uniqueLines(
    values.map((value) => {
      const key = sanitizeText(value, 80) as keyof typeof ASSURANCE_TITRE_ETUDE_DOCUMENT_LABELS
      return ASSURANCE_TITRE_ETUDE_DOCUMENT_LABELS[key] ?? sanitizeText(value, 120)
    }),
    120
  )
}

function sanitizeSnapshot(
  snapshot?: Partial<AssuranceTitreContractDossierSnapshot> | null
): AssuranceTitreContractDossierSnapshot {
  return {
    contactName: sanitizeText(snapshot?.contactName, 160),
    structureName: sanitizeText(snapshot?.structureName, 160) || undefined,
    propertyAddress: sanitizeText(snapshot?.propertyAddress, 220) || undefined,
    propertyPostalCode: sanitizeText(snapshot?.propertyPostalCode, 32) || undefined,
    propertyCity: sanitizeText(snapshot?.propertyCity, 120) || undefined,
    operationLabel: sanitizeText(snapshot?.operationLabel, 160) || undefined,
    propertyTypeLabel: sanitizeText(snapshot?.propertyTypeLabel, 120) || undefined,
    needLabel: sanitizeText(snapshot?.needLabel, 160) || undefined,
    capitalAmount: parsePositiveNumber(snapshot?.capitalAmount),
    riskLabels: uniqueLines(snapshot?.riskLabels ?? [], 120),
    details: sanitizeText(snapshot?.details, 2000) || undefined,
    parties: uniqueLines(snapshot?.parties ?? [], 160),
    availableDocuments: uniqueLines(snapshot?.availableDocuments ?? [], 120),
  }
}

export function buildAssuranceTitreDossierSnapshotFromUserData(args: {
  initialQuestionnaireJson?: string | null
  etudeQuestionnaireJson?: string | null
  fallbackName?: string | null
  fallbackStructureName?: string | null
}): AssuranceTitreContractDossierSnapshot {
  const initial = parseJsonObject(args.initialQuestionnaireJson) as
    | (Partial<AssuranceTitreData> & { email?: string | null })
    | null
  const etude = parseJsonObject(args.etudeQuestionnaireJson) as
    | Partial<AssuranceTitreEtudeQuestionnaireV1>
    | null

  const etudeRisks = readRiskLabels(etude?.risque?.risquesIdentifies)
  const initialRisks = readRiskLabels(initial?.risquesIdentifies)
  const parties = [
    sanitizeText(etude?.parties?.notaireNom, 120)
      ? `Notaire: ${sanitizeText(etude?.parties?.notaireNom, 120)}`
      : "",
    sanitizeText(etude?.parties?.vendeurNom, 120)
      ? `Vendeur: ${sanitizeText(etude?.parties?.vendeurNom, 120)}`
      : "",
    sanitizeText(etude?.parties?.banqueNom, 120)
      ? `Banque: ${sanitizeText(etude?.parties?.banqueNom, 120)}`
      : "",
    sanitizeText(etude?.parties?.avocatConseil, 120)
      ? `Conseil: ${sanitizeText(etude?.parties?.avocatConseil, 120)}`
      : "",
  ]

  return sanitizeSnapshot({
    contactName:
      sanitizeText(etude?.contact?.nomComplet, 160) ||
      sanitizeText(initial?.nomComplet, 160) ||
      sanitizeText(args.fallbackName, 160) ||
      sanitizeText(args.fallbackStructureName, 160),
    structureName:
      sanitizeText(etude?.contact?.raisonSociale, 160) ||
      sanitizeText(initial?.raisonSociale, 160) ||
      sanitizeText(args.fallbackStructureName, 160) ||
      undefined,
    propertyAddress:
      sanitizeText(etude?.bien?.adresseBien, 220) ||
      sanitizeText(initial?.adresseBien, 220) ||
      undefined,
    propertyPostalCode:
      sanitizeText(etude?.bien?.codePostalBien, 32) ||
      sanitizeText(initial?.codePostalBien, 32) ||
      undefined,
    propertyCity:
      sanitizeText(etude?.bien?.villeBien, 120) ||
      sanitizeText(initial?.villeBien, 120) ||
      undefined,
    operationLabel:
      readOperationLabel(etude?.operation?.typeOperation) ||
      readOperationLabel(initial?.typeOperation),
    propertyTypeLabel:
      readPropertyTypeLabel(etude?.operation?.typeBien) ||
      readPropertyTypeLabel(initial?.typeBien),
    needLabel:
      readNeedLabel(etude?.operation?.besoinPrincipal) ||
      readNeedLabel(initial?.besoinPrincipal),
    capitalAmount:
      parsePositiveNumber(etude?.operation?.montantOperation) ||
      parsePositiveNumber(initial?.montantOperation),
    riskLabels: etudeRisks.length > 0 ? etudeRisks : initialRisks,
    details:
      sanitizeText(etude?.risque?.detailsAnomalies, 2000) ||
      sanitizeText(initial?.message, 2000) ||
      undefined,
    parties,
    availableDocuments: readDocumentLabels(etude?.documents?.piecesDisponibles),
  })
}

function normalizeCoverageDurationYears(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim())
  if (!Number.isFinite(n) || n <= 0) return 10
  return Math.max(1, Math.min(30, Math.round(n)))
}

export function buildAssuranceTitreContractConfig(input: {
  referenceContrat: string
  primeAnnuelleTtc: number
  primeAnnuelleHt?: number | null
  coverageDurationYears?: number | null
  productLabel?: string | null
  dossier?: Partial<AssuranceTitreContractDossierSnapshot> | null
}): AssuranceTitreContractConfig {
  const primeAnnuelleTtc = roundMoney(Math.max(0, input.primeAnnuelleTtc))
  const inferredHt = roundMoney(primeAnnuelleTtc / 1.2)
  const primeAnnuelleHt = roundMoney(
    Math.max(
      0,
      Number.isFinite(input.primeAnnuelleHt ?? Number.NaN)
        ? Number(input.primeAnnuelleHt)
        : inferredHt
    )
  )

  return {
    version: "assurance_titre_dossier_v1",
    modeEtude: true,
    productType: "assurance_titre",
    referenceContrat: sanitizeText(input.referenceContrat, 120) || "TITRE",
    productLabel: sanitizeText(input.productLabel, 120) || "Assurance titre — proposition digitale",
    periodicite: "annuel",
    installmentsPerYear: 1,
    monthsStep: 12,
    primeAnnuelleHt,
    primeAnnuelleTtc,
    montantParEcheanceTtc: primeAnnuelleTtc,
    coverageDurationYears: normalizeCoverageDurationYears(input.coverageDurationYears),
    dossier: sanitizeSnapshot(input.dossier),
  }
}

export function serializeAssuranceTitreContractConfig(config: AssuranceTitreContractConfig): string {
  const envelope: AssuranceTitreConfigEnvelope = {
    assuranceTitreContractConfig: config,
  }
  return JSON.stringify(envelope)
}

function parseConfigEnvelope(raw: string | null | undefined): AssuranceTitreContractConfig | null {
  const parsed = parseJsonObject(raw)
  const cfgRaw = parsed?.assuranceTitreContractConfig
  if (!cfgRaw || typeof cfgRaw !== "object" || Array.isArray(cfgRaw)) return null
  const cfg = cfgRaw as Partial<AssuranceTitreContractConfig>
  return buildAssuranceTitreContractConfig({
    referenceContrat: sanitizeText(cfg.referenceContrat, 120) || "TITRE",
    primeAnnuelleTtc:
      parsePositiveNumber(cfg.primeAnnuelleTtc) ?? parsePositiveNumber(cfg.montantParEcheanceTtc) ?? 0,
    primeAnnuelleHt: parsePositiveNumber(cfg.primeAnnuelleHt),
    coverageDurationYears: normalizeCoverageDurationYears(cfg.coverageDurationYears),
    productLabel: sanitizeText(cfg.productLabel, 120),
    dossier: sanitizeSnapshot(cfg.dossier),
  })
}

export function hasAssuranceTitreContractConfig(raw: string | null | undefined): boolean {
  return parseConfigEnvelope(raw) != null
}

export function readAssuranceTitreContractConfig(
  raw: string | null | undefined,
  fallbackPremiumTtc: number,
  referenceContrat: string
): AssuranceTitreContractConfig {
  const existing = parseConfigEnvelope(raw)
  if (existing) {
    return {
      ...existing,
      referenceContrat: sanitizeText(existing.referenceContrat, 120) || sanitizeText(referenceContrat, 120) || "TITRE",
    }
  }
  return buildAssuranceTitreContractConfig({
    referenceContrat,
    primeAnnuelleTtc: roundMoney(Math.max(0, fallbackPremiumTtc)),
    primeAnnuelleHt: roundMoney(Math.max(0, fallbackPremiumTtc / 1.2)),
  })
}

export function readAssuranceTitreCoverageDurationYears(
  raw: string | null | undefined,
  fallback = 10
): number {
  const existing = parseConfigEnvelope(raw)
  if (existing) {
    return existing.coverageDurationYears
  }
  return normalizeCoverageDurationYears(fallback)
}
