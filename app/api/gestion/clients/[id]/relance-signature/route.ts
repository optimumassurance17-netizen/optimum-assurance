import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendPendingSignatureReminder } from "@/lib/signature-reminder-send"

/** Renvoie le lien de signature déjà ouvert. Ne crée pas de nouvelle demande. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { id: userId } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    const signatureRequestId =
      body && typeof body === "object" && typeof (body as { signatureRequestId?: unknown }).signatureRequestId === "string"
        ? (body as { signatureRequestId: string }).signatureRequestId.trim()
        : ""
    if (!signatureRequestId) {
      return NextResponse.json({ error: "Signature introuvable." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const pending = await prisma.pendingSignature.findFirst({
      where: { userId: user.id, signatureRequestId },
    })
    if (!pending) {
      return NextResponse.json({ error: "Aucune signature en attente pour cette fiche." }, { status: 404 })
    }

    const reminded = await sendPendingSignatureReminder({
      pending,
      adminEmail: session.user.email,
    })
    if (!reminded.ok) {
      return NextResponse.json({ error: reminded.error }, { status: reminded.status })
    }
    if (!reminded.emailSent) {
      return NextResponse.json({
        ok: true,
        emailSent: false,
        warning: reminded.warning,
        signatureLink: reminded.signatureLink,
      })
    }
    return NextResponse.json({ ok: true, emailSent: true, sentTo: reminded.sentTo })
  } catch (error) {
    console.error("[gestion/clients/relance-signature]", error)
    return NextResponse.json({ error: "Impossible de relancer la signature." }, { status: 500 })
  }
}
