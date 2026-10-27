import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f-]{36}$/i

/** Annule une signature en attente et libère le client pour une nouvelle invitation. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ signatureRequestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { signatureRequestId: raw } = await params
    const signatureRequestId = raw?.trim() ?? ""
    if (!UUID_RE.test(signatureRequestId)) {
      return NextResponse.json({ error: "Identifiant de demande invalide" }, { status: 400 })
    }

    const pending = await prisma.pendingSignature.findUnique({
      where: { signatureRequestId },
    })
    if (!pending) {
      return NextResponse.json(
        { error: "Demande introuvable ou déjà finalisée (contrat créé ou déjà annulée)." },
        { status: 404 }
      )
    }

    await prisma.pendingSignature.delete({
      where: { signatureRequestId },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "pending_signature_cancelled",
      targetType: "pending_signature",
      targetId: signatureRequestId,
      details: { userId: pending.userId },
    })

    return NextResponse.json({ ok: true, message: "Demande de signature annulée." })
  } catch (e) {
    console.error("[gestion/pending-signatures DELETE]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Annulation impossible" },
      { status: 500 }
    )
  }
}
