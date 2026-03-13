import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

/**
 * Liste les documents uploadés (UserDocument) d'un client - pour admin
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id: userId } = await params

    const docs = await prisma.userDocument.findMany({
      where: { userId },
      select: { id: true, type: true, filename: true, size: true, createdAt: true },
      orderBy: { type: "asc" },
    })

    return NextResponse.json(docs)
  } catch (error) {
    console.error("Erreur liste documents client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
