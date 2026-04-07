import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { asJsonObject } from "@/lib/json-object"
import { prisma } from "@/lib/prisma"

/**
 * Liste les sinistres d'un client
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

    const sinistres = await prisma.sinistre.findMany({
      where: { userId },
      include: {
        userDocument: { select: { id: true, filename: true, type: true } },
      },
      orderBy: { dateSinistre: "desc" },
    })

    return NextResponse.json(sinistres)
  } catch (error) {
    console.error("Erreur liste sinistres:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

/**
 * Crée un sinistre pour un client, optionnellement lié à un relevé de sinistralité
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id: userId } = await params

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const body = asJsonObject<{
      dateSinistre?: string
      montantIndemnisation?: number | string
      description?: string
      userDocumentId?: string
    }>(await request.json())
    const { dateSinistre, montantIndemnisation, description, userDocumentId } = body

    if (!dateSinistre) {
      return NextResponse.json(
        { error: "La date du sinistre est requise" },
        { status: 400 }
      )
    }

    if (userDocumentId) {
      const doc = await prisma.userDocument.findFirst({
        where: { id: userDocumentId, userId },
      })
      if (!doc) {
        return NextResponse.json(
          { error: "Relevé de sinistralité introuvable pour ce client" },
          { status: 400 }
        )
      }
    }

    const sinistre = await prisma.sinistre.create({
      data: {
        userId,
        dateSinistre: new Date(dateSinistre),
        montantIndemnisation:
          montantIndemnisation != null ? Number(montantIndemnisation) : null,
        description: description?.trim() || null,
        userDocumentId: userDocumentId || null,
      },
      include: {
        userDocument: { select: { id: true, filename: true, type: true } },
      },
    })

    return NextResponse.json(sinistre)
  } catch (error) {
    console.error("Erreur création sinistre:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
