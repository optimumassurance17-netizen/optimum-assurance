import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"

/**
 * À appeler par un cron (ex: Vercel Cron, GitHub Actions)
 * Envoie des rappels 30 jours avant échéance des attestations
 * Protéger par CRON_SECRET dans les headers
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const secret = process.env.CRON_SECRET
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const attestations = await prisma.document.findMany({
      where: { type: "attestation", status: "valide" },
      include: { user: true },
    })

    let sent = 0
    for (const doc of attestations) {
      const data = JSON.parse(doc.data) as { dateEcheance?: string; raisonSociale?: string }
      const echeance = data.dateEcheance
      if (!echeance) continue

      const parts = echeance.split("/")
      if (parts.length !== 3) continue
      const [d, m, y] = parts.map(Number)
      const dateEcheance = new Date(y, m - 1, d)
      const diff = Math.floor((dateEcheance.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (diff < 0 || diff > 35) continue

      const template = EMAIL_TEMPLATES.rappelRenouvellement(
        data.raisonSociale || doc.user.email,
        echeance
      )
      const ok = await sendEmail({
        to: doc.user.email,
        subject: template.subject,
        text: template.text,
        html: (template as { html?: string }).html,
      })
      if (ok) sent++
    }

    return NextResponse.json({ sent, total: attestations.length })
  } catch (error) {
    console.error("Erreur rappels renouvellement:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
