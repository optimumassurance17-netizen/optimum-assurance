import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { ESIGN_BUCKET_ORIGINALS } from "@/lib/esign/buckets"
import { logAdminActivity } from "@/lib/admin-activity"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f-]{36}$/i

/**
 * Annule une signature en attente : libère le client pour une nouvelle invitation,
 * supprime la ligne Supabase `sign_requests` et le PDF original si possible.
 */
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

    const supabase = createSupabaseServiceClient()
    if (supabase) {
      const { data: sr } = await supabase
        .from("sign_requests")
        .select("document_storage_path")
        .eq("id", signatureRequestId)
        .maybeSingle()

      const path = sr?.document_storage_path as string | undefined
      const { error: delReqErr } = await supabase.from("sign_requests").delete().eq("id", signatureRequestId)
      if (delReqErr) {
        console.error("[gestion/pending-signatures DELETE] sign_requests", delReqErr)
      }
      if (path?.trim()) {
        const { error: rmErr } = await supabase.storage.from(ESIGN_BUCKET_ORIGINALS).remove([path.trim()])
        if (rmErr) console.error("[gestion/pending-signatures DELETE] storage remove", rmErr)
      }
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
