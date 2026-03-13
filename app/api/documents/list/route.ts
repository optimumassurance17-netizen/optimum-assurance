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

    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      select: { id: true, type: true, numero: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Erreur liste documents:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
