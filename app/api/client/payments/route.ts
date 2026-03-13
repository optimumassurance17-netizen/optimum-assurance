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

    const payments = await prisma.payment.findMany({
      where: { userId: session.user.id },
      select: { id: true, amount: true, status: true, paidAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Erreur liste paiements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
