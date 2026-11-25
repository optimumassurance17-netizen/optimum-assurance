import type { InsuranceContract } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { parseActivitiesJson } from "@/lib/insurance-contract-activities"
import { applyDoAttestationFacts, resolveDoAttestationFacts, type DoAttestationFacts } from "@/lib/do-attestation-facts"
import { activitesAvecLignesCouverture, lignesCouvertureLots } from "@/lib/do-options-lots"

export type DoAttestationFactsLoaded = DoAttestationFacts & { coverageLines: string[] }

type DoClientSource = {
  companyAddress?: string | null
  companyPostalCode?: string | null
  companyCity?: string | null
  lead: Record<string, unknown> | null
  leadCoutTotal: number | null
}

function parseLeadData(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

async function loadDoClientSource(userId: string): Promise<DoClientSource | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      adresse: true,
      codePostal: true,
      ville: true,
      doInitialQuestionnaireJson: true,
      doEtudeQuestionnaireJson: true,
    },
  })
  if (!user) return null

  let lead: Record<string, unknown> | null = parseLeadData(user.doInitialQuestionnaireJson)
  const etude = parseLeadData(user.doEtudeQuestionnaireJson)
  if (etude) lead = { ...(lead ?? {}), ...etude }
  let leadCoutTotal: number | null = null
  const email = user.email?.trim()
  if (email) {
    const row = await prisma.devisDommageOuvrageLead.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      select: { data: true, coutTotal: true },
    })
    if (row) {
      const fromLead = parseLeadData(row.data)
      if (fromLead) lead = { ...(lead ?? {}), ...fromLead }
      leadCoutTotal = row.coutTotal
    }
  }

  return {
    companyAddress: user.adresse,
    companyPostalCode: user.codePostal,
    companyCity: user.ville,
    lead,
    leadCoutTotal,
  }
}

/** Lots choisis sur la demande, pour les recopier sur le contrat en ligne. */
export async function coverageLinesForDoUser(userId: string): Promise<string[]> {
  const source = await loadDoClientSource(userId)
  return source?.lead ? lignesCouvertureLots(source.lead) : []
}

/** Relit la demande de devis DO du client pour compléter l'attestation, sans écrire en base. */
export async function loadDoAttestationFacts(
  contract: Pick<InsuranceContract, "productType" | "userId" | "projectAddress" | "activitiesJson" | "address">
): Promise<DoAttestationFactsLoaded> {
  const activities = parseActivitiesJson(contract.activitiesJson)
  if (contract.productType !== "do") {
    return {
      ...resolveDoAttestationFacts({
        projectAddress: contract.projectAddress,
        activities,
      }),
      coverageLines: [],
    }
  }

  const source = contract.userId ? await loadDoClientSource(contract.userId) : null
  return {
    ...resolveDoAttestationFacts({
      projectAddress: contract.projectAddress,
      activities,
      companyAddress: source?.companyAddress,
      companyPostalCode: source?.companyPostalCode,
      companyCity: source?.companyCity,
      lead: source?.lead,
      leadCoutTotal: source?.leadCoutTotal ?? null,
    }),
    coverageLines: source?.lead ? lignesCouvertureLots(source.lead) : [],
  }
}

/** Copie en mémoire : le PDF affiche le chantier, le plafond et les lots choisis. */
export async function prepareDoContractForPdf<T extends InsuranceContract>(contract: T): Promise<T> {
  if (contract.productType !== "do") return contract
  const facts = await loadDoAttestationFacts(contract)
  const prepared = applyDoAttestationFacts(contract, facts)
  const previous = parseActivitiesJson(prepared.activitiesJson)
  const activities = activitesAvecLignesCouverture(previous, facts.coverageLines)
  if (activities.length === previous.length) return prepared
  return { ...prepared, activitiesJson: JSON.stringify(activities) }
}
