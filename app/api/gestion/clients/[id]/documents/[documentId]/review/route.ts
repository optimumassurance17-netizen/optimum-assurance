import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { USER_DOCUMENT_REVIEW_ACTION } from "@/lib/user-document-review"
import { UPLOAD_DOC_TYPES } from "@/lib/user-document-types"

export async function POST(
  request: NextRequest,
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }

    const payload = body as { status?: unknown; reason?: unknown }
    const status = payload.status
    if (status !== "valid" && status !== "invalid") {
      return NextResponse.json({ error: "Statut invalide (valid|invalid)" }, { status: 400 })
    }

    const reasonRaw = typeof payload.reason === "string" ? payload.reason.trim() : ""
    const reason = reasonRaw.length > 0 ? reasonRaw.slice(0, 500) : null
    if (status === "invalid" && !reason) {
      return NextResponse.json(
        { error: "Veuillez renseigner la raison du refus pour un document invalide." },
        { status: 400 }
      )
    }

    const doc = await prisma.userDocument.findFirst({
      where: {
        id: documentId,
        userId,
        type: { in: [...UPLOAD_DOC_TYPES] },
      },
      select: { id: true },
    })
    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: USER_DOCUMENT_REVIEW_ACTION,
      targetType: "user_document",
      targetId: doc.id,
      details: { status, reason },
    })

    return NextResponse.json({
      ok: true,
      review: {
        status,
        reason,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[gestion/clients/:id/documents/:documentId/review] POST", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
