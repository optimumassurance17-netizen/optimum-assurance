import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, raisonSociale, siret } = body

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Email requis et mot de passe minimum 8 caractères" },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 400 }
      )
    }

    const passwordHash = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        raisonSociale: raisonSociale || null,
        siret: siret || null,
      },
    })

    const template = EMAIL_TEMPLATES.bienvenue(raisonSociale || user.email)
    await sendEmail({
      to: user.email,
      subject: template.subject,
      text: template.text,
      html: (template as { html?: string }).html,
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
    })
  } catch (error) {
    console.error("Erreur inscription:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
