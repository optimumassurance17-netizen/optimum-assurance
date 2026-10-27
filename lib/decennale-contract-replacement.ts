import { logAdminActivity } from "@/lib/admin-activity"
import { isDecennaleContractData } from "@/lib/decennale-contract-data"
import { decennaleRowsToRemove } from "@/lib/decennale-contract-replacement-rules"
import { prisma } from "@/lib/prisma"

export { decennaleRowsToRemove } from "@/lib/decennale-contract-replacement-rules"

/**
 * Supprime les contrats décennale en trop d'un client, ou de tous les clients.
 * Le contrat plateforme et le contrat signé sont traités chacun de leur côté :
 * le nouveau remplace l'ancien, les autres produits restent en place.
 */
export async function collapseDecennaleContractDuplicates(options?: {
  userId?: string
  keepInsuranceContractId?: string
  keepDocumentId?: string
}): Promise<{ removedInsuranceContractIds: string[]; removedDocumentIds: string[] }> {
  const userId = options?.userId?.trim() || undefined
  const [removedInsuranceContractIds, removedDocumentIds] = await Promise.all([
    collapseInsuranceContracts(userId, options?.keepInsuranceContractId),
    collapseSignedContracts(userId, options?.keepDocumentId),
  ])
  return { removedInsuranceContractIds, removedDocumentIds }
}

async function collapseInsuranceContracts(userId: string | undefined, preferredKeepId?: string): Promise<string[]> {
  const rows = await prisma.insuranceContract.findMany({
    where: {
      productType: "decennale",
      ...(userId ? { userId } : { userId: { not: null } }),
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      contractNumber: true,
      status: true,
      paidAt: true,
    },
  })

  const byUser = new Map<string, typeof rows>()
  for (const row of rows) {
    if (!row.userId) continue
    const list = byUser.get(row.userId) ?? []
    list.push(row)
    byUser.set(row.userId, list)
  }

  const removedIds: string[] = []
  for (const [ownerId, ownerRows] of byUser) {
    const removeIds = decennaleRowsToRemove(
      ownerRows,
      ownerId === userId ? preferredKeepId : undefined
    )
    if (removeIds.length === 0) continue
    const removed = ownerRows.filter((row) => removeIds.includes(row.id))
    const kept = ownerRows.find((row) => !removeIds.includes(row.id))
    const deleted = await prisma.insuranceContract.deleteMany({ where: { id: { in: removeIds } } })
    if (deleted.count === 0) continue
    removedIds.push(...removeIds)
    await logAdminActivity({
      adminEmail: "contrat@system",
      action: "decennale_contract_replaced",
      targetType: "insurance_contract",
      targetId: kept?.id ?? removeIds[0],
      details: {
        userId: ownerId,
        keptId: kept?.id ?? null,
        keptNumber: kept?.contractNumber ?? null,
        removed: removed.map((row) => ({
          id: row.id,
          contractNumber: row.contractNumber,
          status: row.status,
          paidAt: row.paidAt?.toISOString() ?? null,
        })),
      },
    })
  }
  return removedIds
}

async function collapseSignedContracts(userId: string | undefined, preferredKeepId?: string): Promise<string[]> {
  const duplicateUsers = userId
    ? [{ userId }]
    : (
        await prisma.document.groupBy({
          by: ["userId"],
          where: { type: "contrat" },
          _count: { _all: true },
        })
      ).filter((group) => group._count._all > 1)

  const removedIds: string[] = []
  for (const group of duplicateUsers) {
    const documents = await prisma.document.findMany({
      where: { userId: group.userId, type: "contrat" },
      select: { id: true, userId: true, numero: true, status: true, data: true, createdAt: true },
    })
    const decennale = documents.filter((document) => isDecennaleContractData(document.data))
    const removeIds = decennaleRowsToRemove(
      decennale,
      group.userId === userId ? preferredKeepId : undefined
    )
    if (removeIds.length === 0) continue
    const removed = decennale.filter((document) => removeIds.includes(document.id))
    const kept = decennale.find((document) => !removeIds.includes(document.id))
    const deleted = await prisma.document.deleteMany({ where: { id: { in: removeIds } } })
    if (deleted.count === 0) continue
    removedIds.push(...removeIds)
    await logAdminActivity({
      adminEmail: "contrat@system",
      action: "decennale_contract_replaced",
      targetType: "document",
      targetId: kept?.id ?? removeIds[0],
      details: {
        userId: group.userId,
        keptId: kept?.id ?? null,
        keptNumber: kept?.numero ?? null,
        removed: removed.map((document) => ({
          id: document.id,
          numero: document.numero,
          status: document.status,
        })),
      },
    })
  }
  return removedIds
}
