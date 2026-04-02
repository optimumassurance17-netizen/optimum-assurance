import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { finalizePendingIfYousignDone } from "@/lib/yousign-finalize-pending"

/**
 * Secours si les webhooks Yousign ne sont pas encore activés : après retour sur /signature/callback,
 * le client appelle cette route pour interroger l’API Yousign et créer le contrat si statut = done.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const signatureRequestId =
      typeof body?.signatureRequestId === "string" ? body.signatureRequestId.trim() : ""
    if (!signatureRequestId) {
      return NextResponse.json({ error: "signatureRequestId requis" }, { status: 400 })
    }

    const result = await finalizePendingIfYousignDone(signatureRequestId, session.user.id)
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    console.error("[yousign/sync-pending]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    )
  }
}
