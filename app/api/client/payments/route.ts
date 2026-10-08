import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { contractLifecyclePresentation, describeClientPayment } from "@/lib/client-echeances"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const [payments, contractPayments] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          amount: true,
          status: true,
          paidAt: true,
          createdAt: true,
          metadata: true,
          molliePaymentId: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contractLifecyclePayment.findMany({
        where: {
          contract: { userId: session.user.id },
        },
        select: {
          id: true,
          amount: true,
          status: true,
          paidAt: true,
          createdAt: true,
          contract: {
            select: {
              contractNumber: true,
              productType: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const merged = [
      ...payments.map((payment) => {
        const described = describeClientPayment({
          metadata: payment.metadata,
          molliePaymentId: payment.molliePaymentId,
          status: payment.status,
        })
        return {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          echeanceLabel: described.echeanceLabel,
          methodLabel: described.methodLabel,
          statusLabel: described.statusLabel,
          virementReference: described.virementReference,
        }
      }),
      ...contractPayments.map((payment) => {
        const described = contractLifecyclePresentation({
          productType: payment.contract.productType,
          contractNumber: payment.contract.contractNumber,
          status: payment.status,
        })
        return {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          contractNumber: payment.contract.contractNumber,
          productType: payment.contract.productType,
          echeanceLabel: described.echeanceLabel,
          methodLabel: described.methodLabel,
          statusLabel: described.statusLabel,
          virementReference: described.virementReference,
        }
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(merged)
  } catch (error) {
    console.error("Erreur liste paiements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
