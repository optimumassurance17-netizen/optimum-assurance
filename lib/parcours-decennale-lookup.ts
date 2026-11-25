import { isDecennaleContractData, isDecennalePendingSignatureData } from "@/lib/decennale-contract-data"
import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import {
  emailParcours,
  PARCOURS_DECENNALE_VIDE,
  type IndicesParcoursDecennale,
} from "@/lib/parcours-decennale"

function vide(): IndicesParcoursDecennale {
  return { ...PARCOURS_DECENNALE_VIDE }
}

/** Indices réels du parcours décennale, à partir de l'email du devis. */
export async function indicesParcoursDecennale(emails: string[]): Promise<Map<string, IndicesParcoursDecennale>> {
  const normalized = [...new Set(emails.map(emailParcours).filter(Boolean))]
  const indices = new Map<string, IndicesParcoursDecennale>()
  for (const email of normalized) indices.set(email, vide())
  if (normalized.length === 0) return indices

  const users = await prisma.user.findMany({
    where: {
      OR: normalized.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })),
    },
    select: {
      id: true,
      email: true,
      payments: {
        where: { status: "paid" },
        take: 1,
        select: { id: true },
      },
      documents: {
        where: { type: "contrat" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { data: true },
      },
      insuranceContracts: {
        where: { productType: "decennale" },
        take: 1,
        select: { id: true },
      },
    },
  })

  const userIds: string[] = []
  for (const user of users) {
    const email = emailParcours(user.email)
    const current = indices.get(email) ?? vide()
    current.hasUserAccount = true
    current.hasPaidPayment = user.payments.length > 0
    current.hasDecennaleContract = user.insuranceContracts.length > 0
    current.hasSignedContractDocument = user.documents.some((document) => isDecennaleContractData(document.data))
    indices.set(email, current)
    userIds.push(user.id)
  }

  if (userIds.length === 0) return indices

  let signatures: { userId: string; contractData: string }[] = []
  try {
    signatures = await prisma.pendingSignature.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, contractData: true },
      orderBy: { createdAt: "desc" },
      take: Math.max(userIds.length * 5, 20),
    })
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      (error.code !== "P2021" && error.code !== "P2022")
    ) {
      throw error
    }
  }
  const userEmail = new Map(users.map((user) => [user.id, emailParcours(user.email)]))
  for (const signature of signatures) {
    if (!isDecennalePendingSignatureData(signature.contractData)) continue
    const email = userEmail.get(signature.userId)
    if (!email) continue
    const current = indices.get(email)
    if (current) current.hasPendingSignature = true
  }

  return indices
}
