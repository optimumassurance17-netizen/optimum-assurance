import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const [paymentsRows, lifecycleRows] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          molliePaymentId: true,
          amount: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contractLifecyclePayment.findMany({
        where: { contract: { userId: session.user.id } },
        select: {
          id: true,
          molliePaymentId: true,
          amount: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const seenMollieIds = new Set<string>()
    const paymentsNormalized = paymentsRows.map((row) => {
      if (row.molliePaymentId) seenMollieIds.add(row.molliePaymentId)
      return {
        id: row.id,
        molliePaymentId: row.molliePaymentId,
        amount: row.amount,
        status: row.status,
        paidAt: row.paidAt,
        createdAt: row.createdAt,
      }
    })
    const unified = [
      ...paymentsNormalized,
      ...lifecycleRows
        .filter((row) => {
          if (!row.molliePaymentId) return true
          if (seenMollieIds.has(row.molliePaymentId)) return false
          seenMollieIds.add(row.molliePaymentId)
          return true
        })
        .map((row) => ({
          id: `lifecycle-${row.id}`,
          molliePaymentId: row.molliePaymentId,
          amount: row.amount,
          status: row.status,
          paidAt: row.paidAt,
          createdAt: row.createdAt,
        })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json(unified)
  } catch (error) {
    console.error("Erreur liste paiements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
