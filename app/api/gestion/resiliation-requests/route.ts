import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const requests = await prisma.resiliationRequest.findMany({
      where: { status: "pending" },
      include: {
        document: {
          include: { user: { select: { email: true, raisonSociale: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Erreur liste demandes résiliation:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
