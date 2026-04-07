import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"

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
    const email = (body as Record<string, unknown>).email
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: true })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!user) {
      return NextResponse.json({ ok: true })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await prisma.passwordResetToken.create({
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
      console.warn("forgot-password: RESEND_API_KEY manquant ou envoi refusé")
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur forgot-password:", error)
    return NextResponse.json({ ok: true })
  }
}
