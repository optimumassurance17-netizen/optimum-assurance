import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { raisonSociale, email } = body

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 })
    }

    const template = EMAIL_TEMPLATES.confirmationSouscription(
      raisonSociale || session.user.name || session.user.email || "Client"
    )

    const ok = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: (template as { html?: string }).html,
    })

    return NextResponse.json({ ok })
  } catch (error) {
    console.error("Erreur envoi email confirmation:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi" },
      { status: 500 }
    )
  }
}
