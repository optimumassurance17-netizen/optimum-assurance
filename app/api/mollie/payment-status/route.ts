import { NextRequest, NextResponse } from "next/server"
import { createMollieClient } from "@mollie/api-client"
import { interpretPaymentLink, isPaymentLinkId } from "@/lib/card-link-lifetime"
import { stringRecordFromMetadata } from "@/lib/client-echeances"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Non configuré" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("id")

    if (!paymentId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 })
    }

    const mollieClient = createMollieClient({ apiKey })
    if (isPaymentLinkId(paymentId)) {
      const link = await mollieClient.paymentLinks.get(paymentId)
      const local = await prisma.payment.findUnique({
        where: { molliePaymentId: paymentId },
        select: { metadata: true, amount: true, status: true },
      })
      const metadata = stringRecordFromMetadata(local?.metadata)
      const amount = link.amount?.value ? parseFloat(link.amount.value) : local?.amount
      let paymentUrl = ""
      try {
        paymentUrl = link.getPaymentUrl()
      } catch {
        paymentUrl = metadata.checkoutUrl || ""
      }
      let childPaid = Boolean(link.paidAt)
      if (!childPaid) {
        try {
          childPaid = Boolean(await link.getPayments().find((item) => item.status === "paid"))
        } catch (error) {
          console.warn("[payment-status] paiements du lien carte", paymentId, error)
        }
      }
      const view = interpretPaymentLink({
        archived: link.archived,
        paidAt: childPaid ? link.paidAt || new Date().toISOString() : null,
        expiresAt: link.expiresAt,
        paymentUrl,
      })
      if (local?.status === "paid" || view.kind === "paid") {
        return NextResponse.json({ id: paymentId, status: "paid", amount, metadata })
      }
      if (view.kind === "closed") {
        return NextResponse.json({ id: paymentId, status: "expired", amount, metadata })
      }
      return NextResponse.json({ id: paymentId, status: "open", amount, metadata })
    }

    const payment = await mollieClient.payments.get(paymentId)

    const metadata = (payment.metadata as Record<string, string>) || {}

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount?.value ? parseFloat(payment.amount.value) : undefined,
      metadata,
    })
  } catch (error) {
    console.error("Erreur statut paiement:", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    )
  }
}
