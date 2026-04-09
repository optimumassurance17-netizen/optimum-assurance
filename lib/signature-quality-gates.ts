type QualityIssue = string
type SignatureFlow = "decennale" | "custom_pdf"
type Periodicity = "mensuel" | "trimestriel" | "semestriel" | "annuel"

export type SignatureQualityGatePayload = {
  flow: SignatureFlow
  annualTtc: number
  periodicity: Periodicity
  clientLabel: string
  reference: string
  email?: string
  address?: string
  siret?: string
  legalRepresentative?: string
  activitiesCount?: number
  hasPdfFile?: boolean
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

export function runSignatureQualityGates(payload: SignatureQualityGatePayload): QualityIssue[] {
  const issues: QualityIssue[] = []

  if (!hasText(payload.clientLabel)) issues.push("client non identifié")
  if (!hasText(payload.reference)) issues.push("référence dossier manquante")
  if (!isFinitePositive(payload.annualTtc)) issues.push("prime annuelle TTC invalide")

  if (
    payload.periodicity !== "mensuel" &&
    payload.periodicity !== "trimestriel" &&
    payload.periodicity !== "semestriel" &&
    payload.periodicity !== "annuel"
  ) {
    issues.push("périodicité invalide")
  }

  if (payload.flow === "custom_pdf") {
    if (!hasText(payload.email)) issues.push("email client manquant")
    if (payload.hasPdfFile !== true) issues.push("PDF manquant")
  }

  if (payload.flow === "decennale") {
    if (!hasText(payload.email)) issues.push("email client manquant")
    if (!hasText(payload.address)) issues.push("adresse client manquante")
    if (!hasText(payload.legalRepresentative)) issues.push("représentant légal manquant")
    const siret = hasText(payload.siret) ? payload.siret.replace(/\s/g, "") : ""
    if (!/^\d{14}$/.test(siret)) issues.push("SIRET invalide (14 chiffres requis)")
    if (typeof payload.activitiesCount !== "number" || payload.activitiesCount <= 0) {
      issues.push("au moins une activité est requise")
    }
  }

  return issues
}

export function validateSignatureQualityGate(payload: SignatureQualityGatePayload): string | null {
  const issues = runSignatureQualityGates(payload)
  if (issues.length === 0) return null
  return `Pré-contrôle qualité bloquant : ${issues.join(" ; ")}.`
}
