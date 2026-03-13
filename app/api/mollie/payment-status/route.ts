import { NextRequest, NextResponse } from "next/server"
import { createMollieClient } from "@mollie/api-client"

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
    const payment = await mollieClient.payments.get(paymentId)

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount?.value ? parseFloat(payment.amount.value) : undefined,
    })
  } catch (error) {
    console.error("Erreur statut paiement:", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    )
  }
}
