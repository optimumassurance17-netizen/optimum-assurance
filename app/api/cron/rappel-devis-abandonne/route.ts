import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { isReminderUnsubscribed } from "@/lib/reminder-unsubscribe"

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

    const normalizedLeadEmails = [
      ...new Set(
        leads
          .map((lead) => lead.email.trim().toLowerCase())
          .filter((email) => email.length > 0)
      ),
    ]

    const usersByEmail = new Map<string, { id: string; email: string }>()
    const paidUserIds = new Set<string>()
    const pendingSignatureUserIds = new Set<string>()
    const decennaleContractDocumentUserIds = new Set<string>()
    const decennaleInsuranceContractUserIds = new Set<string>()

    if (normalizedLeadEmails.length > 0) {
      const users = await prisma.user.findMany({
        where: { email: { in: normalizedLeadEmails } },
        select: { id: true, email: true },
      })
      for (const user of users) {
        usersByEmail.set(user.email.trim().toLowerCase(), user)
      }

      const userIds = users.map((user) => user.id)
      if (userIds.length > 0) {
        const [paidPayments, pendingSignatures, contractDocuments, insuranceContracts] = await Promise.all([
          prisma.payment.findMany({
            where: { userId: { in: userIds }, status: "paid" },
            select: { userId: true },
            distinct: ["userId"],
          }),
          prisma.pendingSignature.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true },
            distinct: ["userId"],
          }),
          prisma.document.findMany({
            where: { userId: { in: userIds }, type: "contrat" },
            select: { userId: true },
            distinct: ["userId"],
          }),
          prisma.insuranceContract.findMany({
            where: { userId: { in: userIds }, productType: "decennale" },
            select: { userId: true },
            distinct: ["userId"],
          }),
        ])

        for (const row of paidPayments) paidUserIds.add(row.userId)
        for (const row of pendingSignatures) pendingSignatureUserIds.add(row.userId)
        for (const row of contractDocuments) decennaleContractDocumentUserIds.add(row.userId)
        for (const row of insuranceContracts) {
          if (row.userId) decennaleInsuranceContractUserIds.add(row.userId)
        }
      }
    }

    let sent = 0
    let unsubscribedSkipped = 0
    let progressedSkipped = 0
    for (const lead of leads) {
      const normalizedEmail = lead.email.trim().toLowerCase()
      if (!normalizedEmail) continue

      const user = usersByEmail.get(normalizedEmail)
      if (user) {
        const hasProgressedInJourney =
          paidUserIds.has(user.id) ||
          pendingSignatureUserIds.has(user.id) ||
          decennaleContractDocumentUserIds.has(user.id) ||
          decennaleInsuranceContractUserIds.has(user.id)
        if (hasProgressedInJourney) {
          progressedSkipped++
          continue
        }
      }

      if (await isReminderUnsubscribed(normalizedEmail, "devis_reminder")) {
        unsubscribedSkipped++
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
