import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { logAdminActivity } from "@/lib/admin-activity"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = (await request.json()) as {
      userId?: string
      subject?: string
      body?: string
    }
    const userId = typeof body.userId === "string" ? body.userId.trim() : ""
    const subject = typeof body.subject === "string" ? body.subject.trim() : ""
    const emailBody = typeof body.body === "string" ? body.body.trim() : ""

    if (!userId || !subject || !emailBody) {
      return NextResponse.json({ error: "userId, subject et body requis" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const clientEmail = user.email.trim().toLowerCase()
    const adminEmail = session.user.email?.trim().toLowerCase() || ""
    if (adminEmail && clientEmail === adminEmail) {
      return NextResponse.json(
        {
          error:
            "L’email de cette fiche est le même que votre compte administrateur. Les messages iraient vers vous, pas vers un client distinct. Corrigez l’email sur la fiche ou ouvrez la bonne fiche client.",
        },
        { status: 400 }
      )
    }

    const paragraphs = emailBody
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
    const htmlBody =
      paragraphs.length > 0
        ? paragraphs.map((p) => `<p>${escapeHtmlForEmail(p)}</p>`).join("")
        : `<p>${escapeHtmlForEmail(emailBody)}</p>`

    const replyTo = session.user.email?.trim()
    const sent = await sendEmail({
      to: user.email.trim(),
      subject: subject,
      text: emailBody,
      html: htmlBody,
      ...(replyTo && { replyTo }),
    })

    if (!sent) {
      return NextResponse.json(
        {
          error:
            "Envoi impossible (Resend). Vérifiez RESEND_API_KEY sur Vercel, le domaine d’expédition vérifié sur resend.com, et EMAIL_FROM. En mode test Resend, seuls certains destinataires sont autorisés : vérifiez la doc « testing » sur resend.com.",
        },
        { status: 503 }
      )
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "email_sent",
      targetType: "user",
      targetId: userId,
      details: { subject, recipientEmail: user.email.trim() },
    })

    return NextResponse.json({ ok: true, sentTo: user.email.trim() })
  } catch (error) {
    console.error("Erreur envoi email:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
