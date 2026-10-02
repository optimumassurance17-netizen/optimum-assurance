import { NextRequest, NextResponse } from "next/server"
import { createMollieClient, Locale, PaymentMethod } from "@mollie/api-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { EMAIL_TEMPLATES, emailNotSentBody, sendEmail } from "@/lib/email"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"
import { primeTrimestrielle } from "@/lib/premium"
import { prisma } from "@/lib/prisma"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const sub = await prisma.sepaSubscription.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, raisonSociale: true } } },
    })
    if (!sub) {
      return NextResponse.json({ error: "Abonnement SEPA introuvable" }, { status: 404 })
    }
    if (sub.status === "cancelled") {
      return NextResponse.json({ error: "Cet abonnement est annulé." }, { status: 400 })
    }

    const email = sub.user.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "Aucun email client sur ce dossier." }, { status: 400 })
    }

    const amount = primeTrimestrielle(sub.primeAnnuelle)
    if (!(amount > 0)) {
      return NextResponse.json({ error: "Montant d'échéance invalide." }, { status: 400 })
    }

    const baseUrl = getMolliePublicBaseUrl()
    const installment = sub.trimestresSepaPayes + 1
    const mollie = createMollieClient({ apiKey })
    const payment = await mollie.payments.create({
      amount: { currency: "EUR", value: amount.toFixed(2) },
      description: `Décennale — échéance ${installment} par carte — ${sub.user.raisonSociale || email}`,
      redirectUrl: `${baseUrl}/espace-client`,
      webhookUrl: `${baseUrl}/api/mollie/webhook`,
      method: PaymentMethod.creditcard,
      locale: Locale.fr_FR,
      metadata: {
        type: "sepa_trimestre",
        sepaSubscriptionId: sub.id,
        userId: sub.userId,
        email,
        raisonSociale: sub.user.raisonSociale || "",
        sepaInstallmentNumber: String(installment),
        paiementCarteRelance: "true",
      },
    })

    const checkoutUrl = payment._links?.checkout?.href
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Mollie n'a pas renvoyé de lien de paiement." }, { status: 502 })
    }

    await prisma.sepaSubscription.update({
      where: { id: sub.id },
      data: { sepaPendingPaymentId: payment.id, lastError: null },
    })

    const raisonSociale = sub.user.raisonSociale || email
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
    console.error("[gestion/sepa/relance-carte]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
