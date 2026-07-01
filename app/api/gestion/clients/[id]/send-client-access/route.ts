import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { hash } from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { generateTempPassword, sendClientAccessEmail } from "@/lib/client-access"

/**
 * Depuis la fiche client : (re)génère un accès espace client
 * en forçant un mot de passe temporaire + envoi e-mail.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, raisonSociale: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await hash(tempPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    const sent = await sendClientAccessEmail({
      email: user.email,
      tempPassword,
      mode: "resent",
    })
    if (!sent) {
      await logAdminActivity({
        adminEmail: session.user.email || "admin",
        action: "user_client_access_email_failed",
        targetType: "user",
        targetId: user.id,
        details: { email: user.email },
      })

      return NextResponse.json({
        ok: true,
        sentTo: user.email,
        emailSent: false,
        temporaryPassword: tempPassword,
        warning:
          "Mot de passe temporaire généré, mais email non envoyé. Copiez-le et transmettez-le manuellement au client.",
      })
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "user_client_access_sent",
      targetType: "user",
      targetId: user.id,
      details: { email: user.email },
    })

    return NextResponse.json({
      ok: true,
      sentTo: user.email,
      emailSent: true,
      temporaryPassword: tempPassword,
    })
  } catch (error) {
    console.error("Erreur envoi accès espace client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération de l'accès client" },
      { status: 500 }
    )
  }
}
