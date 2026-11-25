import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { requireManualReminderDispatch } from "@/lib/cron-reminder-mode"
import { isReminderUnsubscribed } from "@/lib/reminder-unsubscribe"
import { indicesParcoursDecennale } from "@/lib/parcours-decennale-lookup"
import { emailParcours, PARCOURS_DECENNALE_VIDE, parcoursDecennaleAbandonne } from "@/lib/parcours-decennale"

/**
 * Cron : rappel devis abandonné 24-48h après envoi
 * Envoie un email aux leads qui n'ont pas souscrit
 * Sécurisé par CRON_SECRET (voir `lib/cron-auth.ts`)
 */
export async function GET(request: NextRequest) {
  try {
    const denied = assertCronAuthorized(request)
    if (denied) return denied
    const manualOnly = requireManualReminderDispatch(request, "rappel-devis-abandonne")
    if (manualOnly) return manualOnly

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
    let unsubscribedSkipped = 0
    let progressedSkipped = 0
    const indices = await indicesParcoursDecennale(leads.map((lead) => lead.email))
    for (const lead of leads) {
      const normalizedEmail = emailParcours(lead.email)
      if (!normalizedEmail) continue
      if (await isReminderUnsubscribed(normalizedEmail, "devis_reminder")) {
        unsubscribedSkipped++
        continue
      }

      if (!parcoursDecennaleAbandonne(indices.get(normalizedEmail) ?? PARCOURS_DECENNALE_VIDE)) {
        progressedSkipped++
        continue
      }

      const template = EMAIL_TEMPLATES.rappelDevisAbandonne(
        lead.raisonSociale || lead.email,
        normalizedEmail,
        lead.primeAnnuelle ?? undefined
      )
      const ok = await sendEmail({
        to: normalizedEmail,
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

    return NextResponse.json({ sent, total: leads.length, unsubscribedSkipped, progressedSkipped })
  } catch (error) {
    console.error("Erreur rappel devis:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
