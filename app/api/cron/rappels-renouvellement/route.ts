import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { isReminderUnsubscribed } from "@/lib/reminder-unsubscribe"

/**
 * À appeler par un cron (ex: Vercel Cron, GitHub Actions)
 * Envoie des rappels 30 jours avant échéance des attestations
 * Sécurisé par CRON_SECRET (voir `lib/cron-auth.ts`)
 */
export async function GET(request: NextRequest) {
  try {
    const denied = assertCronAuthorized(request)
    if (denied) return denied

    const attestations = await prisma.document.findMany({
      where: { type: "attestation", status: "valide" },
      include: { user: true },
    })

    let sent = 0
    let unsubscribedSkipped = 0
    for (const doc of attestations) {
      const data = JSON.parse(doc.data) as { dateEcheance?: string; raisonSociale?: string }
      const echeance = data.dateEcheance
      if (!echeance) continue
      const email = doc.user.email.trim().toLowerCase()
      if (!email) continue
      if (await isReminderUnsubscribed(email, "renewal_reminder")) {
        unsubscribedSkipped++
        continue
      }

      const parts = echeance.split("/")
      if (parts.length !== 3) continue
      const [d, m, y] = parts.map(Number)
      const dateEcheance = new Date(y, m - 1, d)
      const diff = Math.floor((dateEcheance.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (diff < 0 || diff > 35) continue

      const template = EMAIL_TEMPLATES.rappelRenouvellementAvecDesabonnement(
        data.raisonSociale || doc.user.email,
        echeance,
        email
      )
      const ok = await sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: (template as { html?: string }).html,
      })
      if (ok) sent++
    }

    return NextResponse.json({ sent, total: attestations.length, unsubscribedSkipped })
  } catch (error) {
    console.error("Erreur rappels renouvellement:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
