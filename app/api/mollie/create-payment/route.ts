import { NextRequest, NextResponse } from "next/server"
import { createMollieClient, Locale, PaymentMethod } from "@mollie/api-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_METHODS = new Set([
  "sepa",
  "directdebit",
  "creditcard",
  "cb",
  "carte",
  "banktransfer",
  "virement",
])

function asPositiveAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function asTrimmedString(value: unknown, max = 512): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  if (!normalized || normalized.length > max) return undefined
  return normalized
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Mollie non configuré (MOLLIE_API_KEY manquant)" },
        { status: 500 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const raw = body as Record<string, unknown>
    const {
      amount: rawAmount,
      description: rawDescription,
      redirectUrl: rawRedirectUrl,
      metadata: rawMetadata,
      customerEmail: rawCustomerEmail,
      method: rawMethod = "directdebit",
      consumerName: rawConsumerName,
      consumerAccount: rawConsumerAccount,
    } = raw

    const amount = asPositiveAmount(rawAmount)
    const redirectUrl = asTrimmedString(rawRedirectUrl, 2048)
    const description = asTrimmedString(rawDescription, 255) || "Assurance décennale Optimum"
    const methodRaw = asTrimmedString(rawMethod, 32)?.toLowerCase() || "directdebit"
    const customerEmail = asTrimmedString(rawCustomerEmail, 254) || session.user.email?.trim() || undefined
    const metadata = asJsonObject(rawMetadata)
    const consumerName = asTrimmedString(rawConsumerName, 128)
    const consumerAccount = asTrimmedString(rawConsumerAccount, 64)

    if (amount == null) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 })
    }
    if (!redirectUrl || !isSafeHttpUrl(redirectUrl)) {
      return NextResponse.json({ error: "redirectUrl invalide" }, { status: 400 })
    }
    if (customerEmail && !EMAIL_RE.test(customerEmail)) {
      return NextResponse.json({ error: "customerEmail invalide" }, { status: 400 })
    }
    if (!ALLOWED_METHODS.has(methodRaw)) {
      return NextResponse.json({ error: "Méthode de paiement invalide" }, { status: 400 })
    }

    const mollieClient = createMollieClient({ apiKey })

    const baseUrl = getMolliePublicBaseUrl()

    const mollieMethod =
      methodRaw === "sepa" || methodRaw === "directdebit"
        ? PaymentMethod.directdebit
        : methodRaw === "creditcard" || methodRaw === "cb" || methodRaw === "carte"
        ? PaymentMethod.creditcard
        : methodRaw === "banktransfer" || methodRaw === "virement"
        ? PaymentMethod.banktransfer
        : PaymentMethod.directdebit

    const isSepa =
      mollieMethod === PaymentMethod.directdebit &&
      (methodRaw === "sepa" || methodRaw === "directdebit")
    const isCard = mollieMethod === PaymentMethod.creditcard

    // Le webhook est toujours piloté côté serveur: on ignore toute valeur client.
    const paymentParams = {
      amount: {
        currency: "EUR" as const,
        value: String(amount.toFixed(2)),
      },
      description,
      redirectUrl,
      webhookUrl: `${baseUrl}/api/mollie/webhook`,
      metadata: {
        ...metadata,
        userId: session.user.id,
      },
      method: mollieMethod,
      ...(isCard && { locale: Locale.fr_FR }),
      ...(customerEmail && { consumerEmail: customerEmail }),
      ...(consumerName && { consumerName }),
      ...(isSepa &&
        consumerAccount && {
          consumerAccount,
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
