import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import {
  DOCUMENT_DEVIS_EDITION_ACTION,
  isPerDocumentDevisEditionType,
} from "@/lib/devis-edition"

/**
 * PATCH - Autorise ou retire la modification d'un devis précis.
 * Body: { allowDevisEdition: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    const allowDevisEdition = (body as { allowDevisEdition?: unknown } | null)?.allowDevisEdition
    if (typeof allowDevisEdition !== "boolean") {
      return NextResponse.json({ error: "allowDevisEdition requis" }, { status: 400 })
    }

    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, userId: true, type: true, numero: true },
    })
    if (!document?.userId || !isPerDocumentDevisEditionType(document.type)) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    await prisma.adminActivityLog.create({
      data: {
        adminEmail: session.user.email || "admin",
        action: DOCUMENT_DEVIS_EDITION_ACTION,
        targetType: "document",
        targetId: document.id,
        details: JSON.stringify({
          allowDevisEdition,
          userId: document.userId,
          numero: document.numero,
          type: document.type,
        }),
      },
    })

    return NextResponse.json({ allowDevisEdition })
  } catch (error) {
    console.error("Erreur autorisation devis:", error)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
  }
}
