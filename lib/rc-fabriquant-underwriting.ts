/**
 * Logique métier RC Fabriquant (référence cahier des charges interne).
 * L’indicatif est calculé côté serveur et stocké pour la gestion — pas exposé au prospect sur le site.
 */

import type { DevisRcFabriquantData, RcTypeProduit, RcZoneDistribution } from "@/lib/rc-fabriquant-types"

export type { RcTypeProduit, RcZoneDistribution } from "@/lib/rc-fabriquant-types"

/** Entrée normalisée pour scoring / tarification indicative */
export interface RcFabUnderwritingInput {
  typeProduit: RcTypeProduit
  zoneDistribution: RcZoneDistribution
  sousTraitance: boolean
  controleQualite: boolean
  certification: boolean
  testsSecurite: boolean
  caTotal: number
  sinistres5Ans: number
}

export interface RcFabPremiumResult {
  primeHt: number
  frais: number
  primeTtc: number
  tauxLabel: string
  plafond: number
  franchise: number
}

export interface RcFabIndicatifUnderwriting {
  score: number
  refuseAutomatiqueIndicatif: boolean
  primeIndicative: RcFabPremiumResult | null
  /** Motif court pour l’alerte interne */
  motifRefusIndicatif?: string
}

const RISK_FACTOR: Record<RcTypeProduit, number> = {
  alimentaire: 1.4,
  cosmetique: 1.3,
  electronique: 1.2,
  industriel: 1.0,
  batterie: 1.0,
}

function needsCertificationQuestions(type: RcTypeProduit): boolean {
  return type === "batterie" || type === "electronique"
}

/**
 * Prépare l’entrée underwriting : hors « batterie / électronique », certif. & tests ne pénalisent pas (N/A).
 */
export function toUnderwritingInput(data: DevisRcFabriquantData): RcFabUnderwritingInput | null {
  if (
    !data.typeProduit ||
    !data.zoneDistribution ||
    data.caAnnuelTotal == null ||
    !Number.isFinite(data.caAnnuelTotal) ||
    data.caAnnuelTotal <= 0
  ) {
    return null
  }
  const strict = needsCertificationQuestions(data.typeProduit)
  return {
    typeProduit: data.typeProduit,
    zoneDistribution: data.zoneDistribution,
    sousTraitance: Boolean(data.sousTraitance),
    controleQualite: Boolean(data.controleQualite),
    certification: strict ? Boolean(data.certification) : true,
    testsSecurite: strict ? Boolean(data.testsSecurite) : true,
    caTotal: data.caAnnuelTotal,
    sinistres5Ans: Math.max(0, Math.floor(data.sinistres5Ans ?? 0)),
  }
}

export function riskScoring(input: RcFabUnderwritingInput): number {
  let score = 0
  if (input.typeProduit === "batterie") score += 50
  if (input.zoneDistribution === "Monde") score += 20
  if (needsCertificationQuestions(input.typeProduit)) {
    if (!input.certification) score += 40
    if (!input.testsSecurite) score += 40
  }
  if (input.sinistres5Ans > 2) score += 30
  return score
}

export function shouldReject(input: RcFabUnderwritingInput): boolean {
  if (input.typeProduit === "batterie") {
    if (!input.certification || !input.testsSecurite) return true
  }
  return riskScoring(input) > 80
}

export function calculatePremium(input: RcFabUnderwritingInput): RcFabPremiumResult | null {
  if (shouldReject(input)) return null

  if (input.typeProduit === "batterie") {
    const premium = input.caTotal * 0.017
    const primeHt = Math.round(premium)
    const frais = 200
    return {
      primeHt,
      frais,
      primeTtc: Math.round(premium + frais),
      tauxLabel: "1,7 % du CA",
      plafond: 3_000_000,
      franchise: 1000,
    }
  }

  const baseRate = 0.0025
  const riskFactor = RISK_FACTOR[input.typeProduit] ?? 1
  const premium = input.caTotal * baseRate * riskFactor
  const primeHt = Math.round(premium)
  const frais = 150
  return {
    primeHt,
    frais,
    primeTtc: Math.round(premium + frais),
    tauxLabel: "standard (grille interne)",
    plafond: 3_000_000,
    franchise: 1000,
  }
}

export function computeRcFabIndicatif(data: DevisRcFabriquantData): RcFabIndicatifUnderwriting | null {
  const input = toUnderwritingInput(data)
  if (!input) return null
  const score = riskScoring(input)
  const refuse = shouldReject(input)
  let motif: string | undefined
  if (input.typeProduit === "batterie" && (!input.certification || !input.testsSecurite)) {
    motif = "Batterie sans certification CE / normes ou sans tests thermiques (indicatif)"
  } else if (refuse) {
    motif = "Score de risque indicatif > 80"
  }
  return {
    score,
    refuseAutomatiqueIndicatif: refuse,
    primeIndicative: refuse ? null : calculatePremium(input),
    motifRefusIndicatif: refuse ? motif : undefined,
  }
}

/** Gabarit HTML contrat (usage futur PDF / copier-coller) — ne pas confondre avec un contrat juridique final. */
export function generateRcFabContractHtml(
  data: Pick<DevisRcFabriquantData, "raisonSociale" | "activiteFabrication" | "typeProduit">,
  pricing: RcFabPremiumResult
): string {
  const clauseBatterie =
    data.typeProduit === "batterie"
      ? `
  <h2>Clause spécifique - Batteries</h2>
  <p>
  Couverture des risques incendie, explosion et défaut thermique
  sous réserve du respect des normes CE.
  </p>`
      : ""
  return `
  <h1>Contrat RC Fabricant</h1>

  <p><strong>Souscripteur :</strong> ${escapeHtml(data.raisonSociale)}</p>
  <p><strong>Activité :</strong> ${escapeHtml(data.activiteFabrication)}</p>

  <h2>Garanties</h2>
  <ul>
    <li>Responsabilité civile produits après livraison</li>
    <li>Plafond : 3 000 000 €</li>
    <li>Franchise : 1 000 €</li>
  </ul>
  ${clauseBatterie}

  <h2>Prime</h2>
  <p>${pricing.primeTtc} € TTC / an</p>

  <p>Contrat régi par le droit français.</p>
  `.trim()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Gabarit HTML attestation (usage futur) */
export function generateRcFabAttestationHtml(
  data: Pick<DevisRcFabriquantData, "raisonSociale" | "activiteFabrication">
): string {
  const d = new Date()
  const fin = new Date(d)
  fin.setFullYear(fin.getFullYear() + 1)
  return `
  <h1>ATTESTATION D'ASSURANCE</h1>

  <p>OPTIMUM ASSURANCE atteste que :</p>

  <p><strong>${escapeHtml(data.raisonSociale)}</strong></p>

  <p>est assuré en responsabilité civile fabricant.</p>

  <h2>Activité</h2>
  <p>${escapeHtml(data.activiteFabrication)}</p>

  <h2>Garantie</h2>
  <p>Responsabilité civile après livraison</p>

  <h2>Montant</h2>
  <p><strong>3 000 000 € par sinistre</strong></p>

  <p>Valable du ${d.toLocaleDateString("fr-FR")}
  au ${fin.toLocaleDateString("fr-FR")}</p>

  <p>Fait pour servir et valoir ce que de droit.</p>
  `.trim()
}
