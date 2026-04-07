import { NextRequest, NextResponse } from "next/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { sendEmail } from "@/lib/email"
import { asJsonObject } from "@/lib/json-object"
import { escapeHtmlForEmail } from "@/lib/email-layout"

export async function POST(request: NextRequest) {
  const limited = await rateLimitResponse(request, "contact")
  if (limited) return limited

  try {
    const body = asJsonObject<{ nom?: string; email?: string; sujet?: string; message?: string }>(
      await request.json()
    )
    const { nom, email, sujet, message } = body

    if (!nom?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Nom, email et message sont requis" },
        { status: 400 }
      )
    }

    const to = process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_EMAIL || "contact@optimum-assurance.fr"
    const nomT = nom.trim()
    const emailT = email.trim()
    const sujetT = sujet?.trim() || "Non précisé"
    const messageT = message.trim()

    const text = `Nouveau message depuis le formulaire de contact :

Nom : ${nomT}
Email : ${emailT}
Sujet : ${sujetT}

Message :
${messageT}

---
Notification automatique — formulaire optimum-assurance.fr`.trim()

    const html = `
<p style="font-weight:600;font-size:16px;margin:0 0 18px;color:#0f172a;">Nouveau message — formulaire de contact</p>
<p><strong>Nom :</strong> ${escapeHtmlForEmail(nomT)}</p>
<p><strong>Email du visiteur :</strong> <a href="mailto:${escapeHtmlForEmail(emailT)}" style="color:#2563eb;">${escapeHtmlForEmail(emailT)}</a></p>
<p><strong>Sujet :</strong> ${escapeHtmlForEmail(sujetT)}</p>
<p style="margin-top:18px;margin-bottom:8px;"><strong>Message</strong></p>
<p style="margin:0;white-space:pre-wrap;background:#f8fafc;padding:14px 16px;border-radius:10px;border:1px solid #e2e8f0;color:#0f172a;">${escapeHtmlForEmail(messageT)}</p>
<p style="margin-top:20px;font-size:12px;color:#64748b;">Répondre à ce message pour contacter directement l’expéditeur (en-tête Reply-To).</p>`.trim()

    const sent = await sendEmail({
      to,
      replyTo: emailT,
      subject: `Contact Optimum : ${sujetT}`,
      text,
      html,
    })

    if (!sent) {
      return NextResponse.json(
        { error: "Formulaire de contact non configuré (RESEND_API_KEY)" },
        { status: 503 }
      )
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
