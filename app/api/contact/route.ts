import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nom, email, sujet, message } = body

    if (!nom?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Nom, email et message sont requis" },
        { status: 400 }
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Formulaire de contact non configuré" },
        { status: 503 }
      )
    }

    const to = process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"
    const from = process.env.EMAIL_FROM || "Optimum <noreply@optimum-assurance.fr>"

    const contenu = `
Nouveau message depuis le formulaire de contact :

Nom : ${nom.trim()}
Email : ${email.trim()}
Sujet : ${sujet?.trim() || "Non précisé"}

Message :
${message.trim()}

---
Envoyé depuis optimum-assurance.fr
    `.trim()

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        replyTo: email.trim(),
        subject: `Contact Optimum : ${sujet?.trim() || "Sans sujet"}`,
        text: contenu,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || "Erreur envoi")
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur formulaire contact:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'envoi" },
      { status: 500 }
    )
  }
}
