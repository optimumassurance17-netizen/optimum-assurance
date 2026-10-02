import { NextRequest, NextResponse } from "next/server"
import { createMollieClient, Locale, PaymentMethod } from "@mollie/api-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { EMAIL_TEMPLATES, emailNotSentBody, sendEmail } from "@/lib/email"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"
import { prisma } from "@/lib/prisma"

const DECENNALE_ATTESTATION_TYPES = ["attestation", "attestation_nominative"] as const

function montantDuFromAttestation(data: string): number {
  try {
    const parsed = JSON.parse(data) as { primeAnnuelle?: number; primeTrimestrielle?: number }
    if (typeof parsed.primeTrimestrielle === "number" && parsed.primeTrimestrielle > 0) {
      return Math.round(parsed.primeTrimestrielle * 100) / 100
    }
    const annuelle = typeof parsed.primeAnnuelle === "number" ? parsed.primeAnnuelle : 0
    return Math.round((annuelle / 4) * 100) / 100
  } catch {
    return 0
  }
}

/** Envoie au client un lien de paiement carte pour une attestation décennale suspendue. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Mollie non configuré" }, { status: 500 })
    }

    const { id } = await params
    const document = await prisma.document.findFirst({
      where: {
        id,
        type: { in: [...DECENNALE_ATTESTATION_TYPES] },
        status: "suspendu",
      },
      include: { user: true },
    })
    if (!document) {
      return NextResponse.json(
        { error: "Attestation décennale suspendue introuvable." },
        { status: 404 }
      )
    }

    const email = document.user.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "Aucun email client sur cette attestation." }, { status: 400 })
    }

    const amount = montantDuFromAttestation(document.data)
    if (!(amount > 0)) {
      return NextResponse.json(
        { error: "Montant de régularisation introuvable sur l'attestation." },
        { status: 400 }
      )
    }

    const raisonSociale = document.user.raisonSociale || email
    const baseUrl = getMolliePublicBaseUrl()
    const mollie = createMollieClient({ apiKey })
    const payment = await mollie.payments.create({
      amount: { currency: "EUR", value: amount.toFixed(2) },
      description: `Régularisation décennale — ${raisonSociale} (${document.numero})`,
      redirectUrl: `${baseUrl}/confirmation?regularisation=1`,
      webhookUrl: `${baseUrl}/api/mollie/webhook`,
      method: PaymentMethod.creditcard,
      locale: Locale.fr_FR,
      metadata: {
        type: "regularisation",
        attestationId: document.id,
        attestationNumero: document.numero,
        userId: document.userId,
        email,
        raisonSociale,
      },
    })

    const checkoutUrl = payment._links?.checkout?.href
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Mollie n'a pas renvoyé de lien de paiement." }, { status: 502 })
    }

    const template = EMAIL_TEMPLATES.relanceEcheanceCarte(raisonSociale, amount, checkoutUrl, email)
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })

    if (!sent) {
      return NextResponse.json({
        ...emailNotSentBody(),
        checkoutUrl,
        amount,
        paymentId: payment.id,
      })
    }

    return NextResponse.json({
      ok: true,
      sentTo: email,
      amount,
      paymentId: payment.id,
      checkoutUrl,
    })
  } catch (error) {
    console.error("[gestion/documents/relance-carte]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
