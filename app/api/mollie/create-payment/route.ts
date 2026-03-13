import { NextRequest, NextResponse } from "next/server"
import { createMollieClient } from "@mollie/api-client"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Mollie non configuré (MOLLIE_API_KEY manquant)" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      amount,
      description,
      redirectUrl,
      webhookUrl,
      metadata,
      customerEmail,
      method = "directdebit",
    } = body

    if (!amount || !redirectUrl) {
      return NextResponse.json(
        { error: "Montant et redirectUrl requis" },
        { status: 400 }
      )
    }

    const mollieClient = createMollieClient({ apiKey })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const mollieMethod =
      method === "sepa" || method === "directdebit"
        ? ("directdebit" as const)
        : method === "creditcard" || method === "cb"
        ? ("creditcard" as const)
        : (method as "directdebit" | "creditcard")

    const paymentParams = {
      amount: {
        currency: "EUR" as const,
        value: String(Number(amount).toFixed(2)),
      },
      description: description || "Assurance décennale Optimum",
      redirectUrl,
      webhookUrl: webhookUrl || `${baseUrl}/api/mollie/webhook`,
      metadata: metadata || {},
      method: mollieMethod,
      ...(customerEmail && { consumerEmail: customerEmail }),
      ...(body.consumerName && { consumerName: body.consumerName }),
      ...((method === "sepa" || method === "directdebit") &&
        body.consumerAccount && {
          consumerAccount: body.consumerAccount,
        }),
    }

    const payment = await mollieClient.payments.create(paymentParams)

    return NextResponse.json({
      id: payment.id,
      checkoutUrl: payment._links?.checkout?.href,
      status: payment.status,
    })
  } catch (error) {
    console.error("Erreur Mollie:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    )
  }
}
