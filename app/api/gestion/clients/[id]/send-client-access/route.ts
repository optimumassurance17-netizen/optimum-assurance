import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { hash } from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"
import { logAdminActivity } from "@/lib/admin-activity"

function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let pwd = ""
  for (let i = 0; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}

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

    const subject = "Accès espace client — Optimum Assurance"
    const text = `Bonjour,\n\nVotre accès à l’espace client Optimum Assurance est prêt.\n\nEmail : ${user.email}\nMot de passe temporaire : ${tempPassword}\n\nConnexion : ${SITE_URL}/connexion\nMerci de changer votre mot de passe dès la première connexion.\n\nCordialement,\nOptimum Assurance`
    const html = `<p>Bonjour,</p><p>Votre accès à l’espace client Optimum Assurance est prêt.</p><p><strong>Email :</strong> ${user.email}<br><strong>Mot de passe temporaire :</strong> ${tempPassword}</p><p><a href="${SITE_URL}/connexion" style="color:#2563eb;font-weight:bold">Se connecter à mon espace client</a></p><p>Merci de changer votre mot de passe dès la première connexion.</p><p>Cordialement,<br>Optimum Assurance</p>`

    const sent = await sendEmail({
      to: user.email,
      subject,
      text,
      html,
    })
    if (!sent) {
      return NextResponse.json(
        { error: "Envoi email impossible (RESEND_API_KEY / domaine expéditeur)." },
        { status: 503 }
      )
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "user_client_access_sent",
      targetType: "user",
      targetId: user.id,
      details: { email: user.email },
    })

    return NextResponse.json({ ok: true, email: user.email })
  } catch (error) {
    console.error("Erreur envoi accès espace client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération de l'accès client" },
      { status: 500 }
    )
  }
}
