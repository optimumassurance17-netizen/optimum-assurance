import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, subject, body: emailBody } = body

    if (!userId || !subject || !emailBody) {
      return NextResponse.json({ error: "userId, subject et body requis" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const sent = await sendEmail({
      to: user.email,
      subject: String(subject).trim(),
      text: String(emailBody).trim(),
      html: `<p>${String(emailBody).trim().replace(/\n/g, "</p><p>")}</p>`,
    })

    if (!sent) {
      return NextResponse.json({ error: "Envoi d'email non configuré" }, { status: 503 })
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "email_sent",
      targetType: "user",
      targetId: userId,
      details: { subject },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur envoi email:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
