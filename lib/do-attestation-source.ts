import type { InsuranceContract } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { parseActivitiesJson } from "@/lib/insurance-contract-activities"
import { applyDoAttestationFacts, resolveDoAttestationFacts, type DoAttestationFacts } from "@/lib/do-attestation-facts"

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

/** Relit la demande de devis DO du client pour compléter l'attestation, sans écrire en base. */
export async function loadDoAttestationFacts(
  contract: Pick<InsuranceContract, "productType" | "userId" | "projectAddress" | "activitiesJson" | "address">
): Promise<DoAttestationFacts> {
  const activities = parseActivitiesJson(contract.activitiesJson)
  if (contract.productType !== "do") {
    return resolveDoAttestationFacts({
      projectAddress: contract.projectAddress,
      activities,
    })
  }

  const user = contract.userId
    ? await prisma.user.findUnique({
        where: { id: contract.userId },
        select: {
          email: true,
          adresse: true,
          codePostal: true,
          ville: true,
          doInitialQuestionnaireJson: true,
          doEtudeQuestionnaireJson: true,
        },
      })
    : null

  let lead: Record<string, unknown> | null = parseLeadData(user?.doInitialQuestionnaireJson)
  const etude = parseLeadData(user?.doEtudeQuestionnaireJson)
  if (etude) lead = { ...(lead ?? {}), ...etude }
  let leadCoutTotal: number | null = null
  const email = user?.email?.trim()
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

  return resolveDoAttestationFacts({
    projectAddress: contract.projectAddress,
    activities,
    companyAddress: user?.adresse,
    companyPostalCode: user?.codePostal,
    companyCity: user?.ville,
    lead,
    leadCoutTotal,
  })
}

/** Copie en mémoire : le PDF et la page de vérification affichent le chantier et le plafond. */
export async function prepareDoContractForPdf<T extends InsuranceContract>(contract: T): Promise<T> {
  if (contract.productType !== "do") return contract
  const facts = await loadDoAttestationFacts(contract)
  return applyDoAttestationFacts(contract, facts)
}
