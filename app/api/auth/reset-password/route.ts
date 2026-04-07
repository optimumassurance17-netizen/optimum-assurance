import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }

    const raw = body as Record<string, unknown>
    const token = typeof raw.token === "string" ? raw.token.trim() : ""
    const password = typeof raw.password === "string" ? raw.password : ""

    if (!token || !password) {
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
