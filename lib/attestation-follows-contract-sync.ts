import { prisma } from "@/lib/prisma"
import { parseActivitiesJson, parseExclusionsJson } from "@/lib/insurance-contract-activities"
import { parseDoConstructionCost } from "@/lib/do-attestation-facts"
import {
  alignAttestationWithContract,
  selectAttestationsToAlign,
  type AttestationAlignRow,
  type ContractAttestationSnapshot,
} from "@/lib/attestation-follows-contract"

function parseData(raw: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/\s/g, "").replace(",", "."))
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function asActivities(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
}

export function snapshotFromInsuranceContract(contract: {
  productType: string
  contractNumber: string
  clientName: string
  siret: string | null
  address: string
  activitiesJson: string | null
  exclusionsJson: string | null
  premium: number
  projectAddress: string | null
  validFrom: Date | null
  validUntil: Date | null
}): ContractAttestationSnapshot | null {
  if (contract.productType === "do") {
    const activities = parseActivitiesJson(contract.activitiesJson)
    return {
      product: "do",
      contractNumber: contract.contractNumber,
      raisonSociale: contract.clientName,
      adresseOperation: contract.projectAddress?.trim() || contract.address,
      primeAnnuelle: contract.premium,
      coutConstruction: parseDoConstructionCost(activities),
    }
  }
  if (contract.productType !== "decennale") return null
  const format = (value: Date | null) => (value ? value.toLocaleDateString("fr-FR") : undefined)
  return {
    product: "decennale",
    contractNumber: contract.contractNumber,
    raisonSociale: contract.clientName,
    siret: contract.siret?.trim() || undefined,
    adresse: contract.address,
    clearLocality: true,
    activites: parseActivitiesJson(contract.activitiesJson),
    exclusions: parseExclusionsJson(contract.exclusionsJson),
    primeAnnuelle: contract.premium,
    dateEffet: format(contract.validFrom),
    dateEcheance: format(contract.validUntil),
  }
}

export function snapshotFromContractDocument(
  numero: string,
  data: Record<string, unknown>
): ContractAttestationSnapshot | null {
  const raw = (asText(data.insuranceProduct) || asText(data.productType)).toLowerCase()
  const product =
    raw === "do" || raw === "dommage-ouvrage" || raw === "dommage_ouvrage"
      ? "do"
      : raw === "decennale" || raw === "décennale"
        ? "decennale"
        : raw
          ? null
          : asText(data.adresseOperation) || asAmount(data.coutConstruction) != null
            ? "do"
            : "decennale"
  if (product == null) return null
  if (product === "do") {
    const activities = asActivities(data.activites)
    return {
      product: "do",
      contractNumber: numero,
      raisonSociale: asText(data.raisonSociale),
      adresseOperation: asText(data.adresseOperation) || asText(data.projectAddress) || asText(data.adresseConstruction),
      primeAnnuelle: asAmount(data.primeAnnuelle),
      coutConstruction: asAmount(data.coutConstruction) ?? parseDoConstructionCost(activities),
    }
  }
  return {
    product: "decennale",
    contractNumber: numero,
    raisonSociale: asText(data.raisonSociale),
    siret: asText(data.siret) || undefined,
    adresse: asText(data.adresse),
    codePostal: asText(data.codePostal),
    ville: asText(data.ville),
    activites: asActivities(data.activites),
    primeAnnuelle: asAmount(data.primeAnnuelle),
    franchise: asAmount(data.franchise),
    plafond: asAmount(data.plafond),
    chiffreAffaires: asAmount(data.chiffreAffaires),
    dateEffet: asText(data.dateEffet) || undefined,
    dateEcheance: asText(data.dateEcheance) || undefined,
  }
}

export async function alignUserAttestationsWithContract(input: {
  userId: string
  snapshot: ContractAttestationSnapshot
  previousClientName?: string | null
  previousProjectAddress?: string | null
}): Promise<string[]> {
  const types = input.snapshot.product === "do" ? ["attestation_do"] : ["attestation", "attestation_nominative"]
  const rows = await prisma.document.findMany({
    where: { userId: input.userId, type: { in: types } },
    select: { id: true, type: true, status: true, data: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  const parsed: AttestationAlignRow[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    createdAt: row.createdAt,
    data: parseData(row.data),
  }))
  const chosen = selectAttestationsToAlign(parsed, input.snapshot, {
    clientName: input.previousClientName,
    projectAddress: input.previousProjectAddress,
  })
  const updated: string[] = []
  for (const row of chosen) {
    const next = alignAttestationWithContract(row.data, input.snapshot)
    if (JSON.stringify(next) === JSON.stringify(row.data)) continue
    await prisma.document.update({
      where: { id: row.id },
      data: { data: JSON.stringify(next) },
    })
    updated.push(row.id)
  }
  return updated
}
