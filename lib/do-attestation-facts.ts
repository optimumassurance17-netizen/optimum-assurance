/**
 * Adresse du chantier et plafond de garantie pour l'attestation dommage ouvrage.
 * Pur : pas de Prisma. Le coût déclaré est le montant de la garantie DO.
 */

export type DoAttestationFacts = {
  constructionAddress: string
  guaranteeAmount: number | null
}

export type DoAttestationSource = {
  projectAddress?: string | null
  activities?: string[] | null
  companyAddress?: string | null
  companyPostalCode?: string | null
  companyCity?: string | null
  lead?: Record<string, unknown> | null
  leadCoutTotal?: number | null
}

function asText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function asAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[\s\u00a0\u202f]/g, "").replace(",", "."))
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function normalizeAddress(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase()
}

function joinAddress(parts: string[], separator = ", "): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(separator)
}

function formatChantier(street: string, postalCode: string, city: string): string {
  const locality = [postalCode, city].filter(Boolean).join(" ")
  return [street, locality].filter(Boolean).join(", ")
}

/** Ligne stable, relue par `parseDoConstructionCost`. */
export function formatDoConstructionCostActivity(amount: number): string {
  return `Coût construction : ${Math.round(amount)}`
}

/** Libellé commun aux devis, conditions particulières et attestation. */
export function doConstructionAddressLine(address: string | null | undefined): string {
  const value = address?.trim()
  return value
    ? `Adresse de construction : ${value}`
    : "Adresse de construction : non renseignée au dossier."
}

/** Le montant des garanties DO est le coût total de construction déclaré. */
export function doGuaranteeAmountLine(
  amount: number | null | undefined,
  formatAmount: (value: number) => string
): string {
  if (amount != null && Number.isFinite(amount) && amount > 0) {
    return `Montant des garanties : ${formatAmount(amount)} (coût total de construction déclaré).`
  }
  return "Montant des garanties : non renseigné au dossier."
}

const COST_LINE_PATTERNS = [
  /co[uû]t\s+construction\s*:\s*([0-9][0-9\s\u00a0\u202f.,]*)/i,
  /co[uû]t\s+pr[eé]visionnel(?:\s+de\s+l['’]op[eé]ration)?\s*:\s*([0-9][0-9\s\u00a0\u202f.,]*)/i,
  /montant\s+pr[eé]visionnel(?:\s+des\s+travaux)?(?:\s*\([^)]*\))?\s*:\s*([0-9][0-9\s\u00a0\u202f.,]*)/i,
]

export function parseDoConstructionCost(activities: string[] | null | undefined): number | null {
  if (!activities?.length) return null
  for (const pattern of COST_LINE_PATTERNS) {
    for (const line of activities) {
      const match = line.match(pattern)
      if (!match?.[1]) continue
      const amount = asAmount(match[1])
      if (amount != null) return Math.round(amount * 100) / 100
    }
  }
  return null
}

function addressFromActivities(activities: string[] | null | undefined): string {
  if (!activities?.length) return ""
  for (const line of activities) {
    const match = line.match(
      /adresse\s+de\s+(?:la\s+construction|construction|l['’]op[eé]ration)\s*:\s*(.+)$/i
    )
    const value = match?.[1]?.trim()
    if (value) return value
  }
  return ""
}

/** Adresse du chantier (questionnaire), jamais le siège. */
export function constructionAddressFromLead(lead: Record<string, unknown> | null | undefined): string {
  if (!lead) return ""
  const operation = lead.operation
  if (operation && typeof operation === "object" && !Array.isArray(operation)) {
    const chantier = operation as Record<string, unknown>
    const fromEtude = formatChantier(
      asText(chantier.adresseChantier),
      asText(chantier.codePostal),
      asText(chantier.ville)
    )
    if (fromEtude) return fromEtude
  }
  return formatChantier(
    asText(lead.adresseConstruction) || asText(lead.adresseChantier) || asText(lead.projectAddress),
    asText(lead.codePostalConstruction) || asText(lead.projectPostalCode),
    asText(lead.villeConstruction) || asText(lead.projectCity)
  )
}

export function readDoLeadConstructionCost(lead: Record<string, unknown> | null | undefined): number | null {
  return leadCostSum(lead)
}

function leadCostSum(lead: Record<string, unknown> | null | undefined): number | null {
  if (!lead) return null
  const nested = lead.cout
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const declared = asAmount((nested as Record<string, unknown>).coutTotalTtc)
    if (declared != null) return declared
  }
  const direct = asAmount(lead.coutTotal) ?? asAmount(lead.coutConstruction)
  if (direct != null) return direct
  const parts = [
    asAmount(lead.coutTravauxVrd),
    asAmount(lead.coutMateriauxMaitreOuvrage),
    asAmount(lead.coutControleTechnique),
    asAmount(lead.coutEtudeSol),
    asAmount(lead.coutMaitriseOeuvre),
  ].filter((value): value is number => value != null)
  if (parts.length === 0) return null
  const total = Math.round(parts.reduce((sum, value) => sum + value, 0) * 100) / 100
  return total > 0 ? total : null
}

function companyAddressVariants(input: DoAttestationSource): string[] {
  const street = asText(input.companyAddress)
  const postalCode = asText(input.companyPostalCode)
  const city = asText(input.companyCity)
  const leadStreet = asText(input.lead?.adresse)
  const leadPostalCode = asText(input.lead?.codePostal)
  const leadCity = asText(input.lead?.ville)
  return [
    street,
    joinAddress([street, postalCode, city], " "),
    joinAddress([street, postalCode, city], ", "),
    joinAddress([street, joinAddress([postalCode, city], " ")], ", "),
    leadStreet,
    joinAddress([leadStreet, leadPostalCode, leadCity], " "),
    joinAddress([leadStreet, leadPostalCode, leadCity], ", "),
  ].filter(Boolean)
}

function addressIsCompany(value: string, variants: string[]): boolean {
  if (!value.trim()) return false
  const normalized = normalizeAddress(value)
  return variants.some((candidate) => normalizeAddress(candidate) === normalized)
}

export function resolveDoAttestationFacts(input: DoAttestationSource): DoAttestationFacts {
  const companyVariants = companyAddressVariants(input)
  const fromActivities = addressFromActivities(input.activities)
  const fromLead = constructionAddressFromLead(input.lead)
  const chantier =
    (fromActivities && !addressIsCompany(fromActivities, companyVariants) ? fromActivities : "") ||
    (fromLead && !addressIsCompany(fromLead, companyVariants) ? fromLead : "")
  const project = asText(input.projectAddress)
  const projectIsCompany = addressIsCompany(project, companyVariants)
  const constructionAddress = chantier && (!project || projectIsCompany) ? chantier : project || chantier

  const parsedCost = parseDoConstructionCost(input.activities)
  const fromLeadTotal = asAmount(input.leadCoutTotal)
  const fromParts = leadCostSum(input.lead)
  const guaranteeAmount = parsedCost ?? fromLeadTotal ?? fromParts

  return { constructionAddress, guaranteeAmount }
}

export function readDoDocumentAttestation(data: Record<string, unknown>): DoAttestationFacts {
  return resolveDoAttestationFacts({
    projectAddress: asText(data.adresseOperation) || asText(data.projectAddress),
    activities: Array.isArray(data.activites)
      ? data.activites.filter((line): line is string => typeof line === "string")
      : [],
    companyAddress: asText(data.adresse),
    companyPostalCode: asText(data.codePostal),
    companyCity: asText(data.ville),
    lead: data,
    leadCoutTotal: asAmount(data.coutConstruction) ?? asAmount(data.montantGaranties),
  })
}

export function applyDoAttestationFacts<
  T extends {
    productType: string
    projectAddress: string | null
    activitiesJson: string | null
  },
>(contract: T, facts: DoAttestationFacts): T {
  if (contract.productType !== "do") return contract
  let activities: string[] = []
  if (contract.activitiesJson?.trim()) {
    try {
      const parsed = JSON.parse(contract.activitiesJson) as unknown
      if (Array.isArray(parsed)) {
        activities = parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      }
    } catch {
      activities = []
    }
  }
  const nextActivities =
    facts.guaranteeAmount != null && parseDoConstructionCost(activities) == null
      ? [...activities, formatDoConstructionCostActivity(facts.guaranteeAmount)]
      : activities
  const address = facts.constructionAddress.trim()
  return {
    ...contract,
    projectAddress: address || contract.projectAddress,
    activitiesJson: JSON.stringify(nextActivities),
  }
}
