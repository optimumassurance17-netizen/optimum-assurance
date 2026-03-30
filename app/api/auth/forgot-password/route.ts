import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 heure

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 })
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/reinitialiser-mot-de-passe?token=${token}`

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Optimum <noreply@optimum-assurance.fr>",
          to: user.email,
          subject: "Réinitialisation de votre mot de passe - Optimum Assurance",
          html: `
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
            <p><a href="${resetUrl}" style="color:#2563eb;font-weight:bold">Cliquez ici pour réinitialiser</a></p>
            <p>Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
            <p>— Optimum Assurance</p>
          `,
        }),
      })
      if (!res.ok) {
        console.error("Erreur envoi email reset:", await res.text())
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur forgot-password:", error)
    return NextResponse.json({ ok: true })
  }
}
