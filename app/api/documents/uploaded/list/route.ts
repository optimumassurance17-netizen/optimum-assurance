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

    const docs = await prisma.userDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { type: "asc" },
    })

    return NextResponse.json(
      docs.map((d) => ({
        id: d.id,
        type: d.type,
        filename: d.filename,
        size: d.size,
        createdAt: d.createdAt,
      }))
    )
  } catch (error) {
    console.error("Erreur liste documents uploadés:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
