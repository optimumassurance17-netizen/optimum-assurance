/**
 * Score de risque souscription — si > seuil → examen manuel (pending_validation).
 */

export type RiskInput = {
  siret?: string | null
  /** Activités ou libellés métiers */
  activities?: string[]
  /** Pièces justificatives manquantes côté dossier */
  missingDocuments?: boolean
  /** Ancienneté entreprise en mois (si connu) */
  companyAgeMonths?: number | null
}

export type RiskResult = {
  score: number
  reject: boolean
  reasons: string[]
}

const HIGH_RISK_KEYWORDS =
  /\b(amiante|désamiantage|démolition|nucléaire|gaz|mine|forage\s*profond|tunnel|barrage)\b/i

const RISK_THRESHOLD_PENDING = 50

export function calculateRiskScore(data: RiskInput): RiskResult {
  const reasons: string[] = []
  let score = 0

  if (!data.siret?.trim()) {
    return { score: 100, reject: true, reasons: ["SIRET requis — dossier refusé"] }
  }

  if (data.missingDocuments) {
    score += 30
    reasons.push("Documents manquants (+30)")
  }

  const act = (data.activities || []).join(" ")
  if (act && HIGH_RISK_KEYWORDS.test(act)) {
    score += 20
    reasons.push("Activité à risque élevé (+20)")
  }

  if (data.companyAgeMonths != null && data.companyAgeMonths < 12) {
    score += 15
    reasons.push("Entreprise de moins de 12 mois (+15)")
  }

  return { score, reject: false, reasons }
}

export function requiresManualReview(score: number): boolean {
  return score > RISK_THRESHOLD_PENDING
}
