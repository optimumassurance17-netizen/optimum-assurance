import { NextRequest, NextResponse } from "next/server"
import { createMollieClient } from "@mollie/api-client"
import { assertCronAuthorized } from "@/lib/cron-auth"
import {
  createSepaTrimestrePayment,
  primeTrimestrielle,
  refreshMandateStatus,
} from "@/lib/mollie-sepa"
import { prisma } from "@/lib/prisma"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"

/**
 * Déclenche les prélèvements SEPA trimestriels avec reconduction automatique annuelle
 * lorsque `nextSepaDue` est atteint. Sécurisé par CRON_SECRET (voir `lib/cron-auth.ts`).
 */
export async function GET(request: NextRequest) {
  try {
    const denied = assertCronAuthorized(request)
    if (denied) return denied

    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "MOLLIE_API_KEY manquant" }, { status: 500 })
    }

    const baseUrl = getMolliePublicBaseUrl()
    const webhookUrl = `${baseUrl}/api/mollie/webhook`
    const redirectUrl = `${baseUrl}/espace-client`

    const now = new Date()
    const mollie = createMollieClient({ apiKey })

    const due = await prisma.sepaSubscription.findMany({
      where: {
        status: { in: ["active", "pending_mandate", "completed"] },
        nextSepaDue: { lte: now },
      },
      include: { user: { select: { id: true, email: true, raisonSociale: true } } },
    })

    let charged = 0
    const errors: string[] = []

    for (const sub of due) {
      if (!sub.mollieMandateId) {
        errors.push(`${sub.id}: pas de mandateId`)
        continue
      }

      try {
        const mandateStatus = await refreshMandateStatus(
          mollie,
          sub.mollieCustomerId,
          sub.mollieMandateId
        )
        if (mandateStatus !== "valid") {
          await prisma.sepaSubscription.update({
            where: { id: sub.id },
            data: {
              status: "pending_mandate",
              lastError: `Mandat ${mandateStatus}`,
            },
          })
          continue
        }

        if (sub.status === "pending_mandate" || sub.status === "completed") {
          await prisma.sepaSubscription.update({
            where: { id: sub.id },
            data: { status: "active", lastError: null },
          })
        }

        const amount = primeTrimestrielle(sub.primeAnnuelle)
        const idx = sub.trimestresSepaPayes + 1
        const idempotencyKey = `sepa-${sub.id}-${idx}-${sub.nextSepaDue?.toISOString().slice(0, 10)}`

        const payment = await createSepaTrimestrePayment(mollie, {
          customerId: sub.mollieCustomerId,
          mandateId: sub.mollieMandateId,
          amount,
          description: `Décennale — échéance SEPA trimestrielle #${idx} — ${sub.user.raisonSociale || sub.user.email}`,
          webhookUrl,
          redirectUrl,
          metadata: {
            type: "sepa_trimestre",
            sepaSubscriptionId: sub.id,
            userId: sub.userId,
            email: sub.user.email,
            raisonSociale: sub.user.raisonSociale || "",
            trimestreIndex: String(idx),
          },
          idempotencyKey,
        })

        await prisma.sepaSubscription.update({
          where: { id: sub.id },
          data: { sepaPendingPaymentId: payment.id },
        })

        charged++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${sub.id}: ${msg}`)
        await prisma.sepaSubscription.update({
          where: { id: sub.id },
          data: { lastError: msg.slice(0, 2000) },
        })
      }
    }

    return NextResponse.json({
      ok: true,
      due: due.length,
      charged,
      errors: errors.length ? errors : undefined,
    })
  } catch (error) {
    console.error("[cron sepa-trimestriel]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
