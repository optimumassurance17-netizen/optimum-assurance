import { NextRequest, NextResponse } from "next/server"
import { createMollieClient, Locale, PaymentMethod } from "@mollie/api-client"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"

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

    const baseUrl = getMolliePublicBaseUrl()

    const mollieMethod =
      method === "sepa" || method === "directdebit"
        ? PaymentMethod.directdebit
        : method === "creditcard" || method === "cb" || method === "carte"
        ? PaymentMethod.creditcard
        : method === "banktransfer" || method === "virement"
        ? PaymentMethod.banktransfer
        : PaymentMethod.directdebit

    const isSepa =
      mollieMethod === PaymentMethod.directdebit &&
      (method === "sepa" || method === "directdebit")
    const isCard = mollieMethod === PaymentMethod.creditcard

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
      ...(isCard && { locale: Locale.fr_FR }),
      ...(customerEmail && { consumerEmail: customerEmail }),
      ...(body.consumerName && { consumerName: body.consumerName }),
      ...(isSepa &&
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
