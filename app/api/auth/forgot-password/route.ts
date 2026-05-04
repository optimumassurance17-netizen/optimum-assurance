import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"
import { Prisma } from "@/lib/generated/prisma"

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 heure

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: true })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: true })
    }
    const rawEmail = (body as Record<string, unknown>).email
    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json({ ok: true })
    }
    const normalizedEmail = rawEmail.trim().toLowerCase()
    if (!normalizedEmail) return NextResponse.json({ ok: true })

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return NextResponse.json({ ok: true })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
    const resetToken = await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    const base = SITE_URL.replace(/\/$/, "")
    const resetUrl = `${base}/reinitialiser-mot-de-passe?token=${token}`
    const tpl = EMAIL_TEMPLATES.motDePasseReinitialisation(resetUrl)

    const sent = await sendEmail({
      to: user.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    })
    if (!sent) {
      // Nettoie le token si l'e-mail n'est pas parti pour éviter des liens fantômes.
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } }).catch(() => undefined)
      console.error("forgot-password: email de réinitialisation non envoyé", {
        userId: user.id,
        hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
        hasEmailFrom: Boolean(process.env.EMAIL_FROM),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      console.error(
        "Erreur forgot-password: table/colonne manquante (PasswordResetToken). Appliquer les migrations Prisma.",
        error
      )
      return NextResponse.json({ ok: true })
    }
    console.error("Erreur forgot-password:", error)
    return NextResponse.json({ ok: true })
  }
}
