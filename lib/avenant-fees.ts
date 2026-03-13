/**
 * Frais d'avenant : 60 € reportés sur la prochaine échéance de prélèvement
 */
import { prisma } from "@/lib/prisma"
import { FRAIS_AVENANT } from "@/lib/types"

export { FRAIS_AVENANT }

/**
 * Retourne le montant total des frais d'avenant en attente pour un utilisateur.
 * À ajouter au montant du prochain prélèvement SEPA.
 */
export async function getPendingAvenantFeesTotal(userId: string): Promise<number> {
  const fees = await prisma.avenantFee.findMany({
    where: { userId, status: "pending" },
  })
  return fees.reduce((sum, f) => sum + f.amount, 0)
}

/**
 * Marque les frais d'avenant en attente comme payés après un prélèvement.
 */
export async function markAvenantFeesAsPaid(userId: string): Promise<void> {
  await prisma.avenantFee.updateMany({
    where: { userId, status: "pending" },
    data: { status: "paid", paidAt: new Date() },
  })
}
