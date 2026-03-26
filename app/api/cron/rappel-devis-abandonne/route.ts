import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { assertCronAuthorized } from "@/lib/cron-auth"

/**
 * Cron : rappel devis abandonné 24-48h après envoi
 * Envoie un email aux leads qui n'ont pas souscrit
 * Sécurisé par CRON_SECRET (voir `lib/cron-auth.ts`)
 */
export async function GET(request: NextRequest) {
  try {
    const denied = assertCronAuthorized(request)
    if (denied) return denied

    const now = new Date()
    const minAge = new Date(now.getTime() - 48 * 60 * 60 * 1000) // 48h
    const maxAge = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24h

    const leads = await prisma.devisLead.findMany({
      where: {
        rappelSentAt: null,
        createdAt: {
          gte: minAge,
          lte: maxAge,
        },
      },
    })

    let sent = 0
    for (const lead of leads) {
      const userWithPayment = await prisma.user.findFirst({
        where: { email: lead.email },
        include: {
          payments: { where: { status: "paid" }, take: 1 },
        },
      })
      if (userWithPayment?.payments?.length) continue

      const template = EMAIL_TEMPLATES.rappelDevisAbandonne(
        lead.raisonSociale || lead.email,
        lead.primeAnnuelle ?? undefined
      )
      const ok = await sendEmail({
        to: lead.email,
        subject: template.subject,
        text: template.text,
        html: (template as { html?: string }).html,
      })
      if (ok) {
        await prisma.devisLead.update({
          where: { id: lead.id },
          data: { rappelSentAt: new Date() },
        })
        sent++
      }
    }

    return NextResponse.json({ sent, total: leads.length })
  } catch (error) {
    console.error("Erreur rappel devis:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
