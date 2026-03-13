import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()
    if (!token || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Token et mot de passe requis" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 })
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    })
    await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur reset-password:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
