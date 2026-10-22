import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { openGedDocument } from "@/lib/ged-open"

export const runtime = "nodejs"

/**
 * Ouvre un document GED client depuis la fiche gestion (admin uniquement).
 * Les fichiers stockés à distance partent par un lien signé, pour dépasser
 * la limite de réponse de l'hébergement.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id: userId, documentId } = await params
    if (!userId || !documentId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    const doc = await prisma.userDocument.findFirst({
      where: { id: documentId, userId },
      select: { id: true, userId: true, type: true, filename: true, filepath: true, mimeType: true },
    })

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    return openGedDocument(doc)
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("dbged:v1:") || message.length > 500) {
      console.error("[gestion/clients/:id/documents/:documentId] GET (détail omis)")
    } else {
      console.error("[gestion/clients/:id/documents/:documentId] GET", error)
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
