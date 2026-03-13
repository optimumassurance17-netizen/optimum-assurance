import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    const document = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
      include: {
        user: { select: { raisonSociale: true, email: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const data = JSON.parse(document.data) as Record<string, unknown>
    // Pour devis_do : enrichir avec les infos du user
    if (document.type === "devis_do" && document.user) {
      data.raisonSociale = document.user.raisonSociale ?? data.raisonSociale
      data.email = document.user.email ?? data.email
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- user exclu de la réponse
    const { user, ...doc } = document
    return NextResponse.json({ ...doc, data })
  } catch (error) {
    console.error("Erreur récupération document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
