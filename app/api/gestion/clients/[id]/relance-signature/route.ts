import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { EMAIL_TEMPLATES, emailNotSentBody, sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { isReminderUnsubscribed } from "@/lib/reminder-unsubscribe"
import { signatureReminderPayload } from "@/lib/signature-reminder"
import { SITE_URL } from "@/lib/site-url"

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
      select: { id: true, email: true, raisonSociale: true },
    })
    if (!user?.email?.trim()) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const pending = await prisma.pendingSignature.findFirst({
      where: { userId: user.id, signatureRequestId },
    })
    if (!pending) {
      return NextResponse.json({ error: "Aucune signature en attente pour cette fiche." }, { status: 404 })
    }

    const email = user.email.trim().toLowerCase()
    if (await isReminderUnsubscribed(email, "signature")) {
      return NextResponse.json(
        { error: "Ce client s'est désinscrit des rappels de signature. L'email n'a pas été envoyé." },
        { status: 409 }
      )
    }

    const payload = signatureReminderPayload(
      pending,
      (user.raisonSociale || user.email).trim(),
      SITE_URL
    )
    const template = EMAIL_TEMPLATES.rappelSignatureEnAttente(
      payload.raisonSociale,
      payload.signatureLink,
      email,
      { produitLabel: payload.produitLabel, reference: payload.reference }
    )
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    await logAdminActivity({
      adminEmail: session.user.email,
      action: "signature_relance_manuelle",
      targetType: "user",
      targetId: user.id,
      details: {
        signatureRequestId,
        contractNumero: pending.contractNumero,
        emailSent: sent,
      },
    })
    if (!sent) {
      return NextResponse.json({ ...emailNotSentBody(), signatureLink: payload.signatureLink })
    }
    return NextResponse.json({ ok: true, emailSent: true, sentTo: email })
  } catch (error) {
    console.error("[gestion/clients/relance-signature]", error)
    return NextResponse.json({ error: "Impossible de relancer la signature." }, { status: 500 })
  }
}
