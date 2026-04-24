import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { DOC_TYPES_DECENNALE } from "@/lib/user-document-types"

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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const payload = body as Record<string, unknown>
    const dateSinistreRaw = payload.dateSinistre
    const montantIndemnisationRaw = payload.montantIndemnisation
    const descriptionRaw = payload.description
    const userDocumentIdRaw = payload.userDocumentId

    const dateSinistre = typeof dateSinistreRaw === "string" ? dateSinistreRaw.trim() : ""
    if (!dateSinistre) {
      return NextResponse.json(
        { error: "La date du sinistre est requise" },
        { status: 400 }
      )
    }
    const parsedDate = new Date(dateSinistre)
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "dateSinistre invalide" }, { status: 400 })
    }

    const userDocumentId =
      typeof userDocumentIdRaw === "string" ? userDocumentIdRaw.trim() : ""
    const description =
      descriptionRaw == null
        ? null
        : typeof descriptionRaw === "string"
          ? descriptionRaw.trim() || null
          : null

    let montantIndemnisation: number | null = null
    if (
      montantIndemnisationRaw !== null &&
      montantIndemnisationRaw !== undefined &&
      montantIndemnisationRaw !== ""
    ) {
      const parsed =
        typeof montantIndemnisationRaw === "number"
          ? montantIndemnisationRaw
          : Number(montantIndemnisationRaw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "montantIndemnisation invalide (nombre >= 0 attendu)" },
          { status: 400 }
        )
      }
      montantIndemnisation = parsed
    }

    if (userDocumentId) {
      const doc = await prisma.userDocument.findFirst({
        where: { id: userDocumentId, userId, type: DOC_TYPES_DECENNALE[5] },
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
        dateSinistre: parsedDate,
        montantIndemnisation,
        description,
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
