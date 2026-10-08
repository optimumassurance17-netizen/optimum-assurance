import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createMollieClient, Locale, PaymentMethod } from "@mollie/api-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { EMAIL_TEMPLATES, emailNotSentBody, sendEmail } from "@/lib/email"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { applyEcheancePaidEffects, loadClientEcheances } from "@/lib/client-echeance-service"
import { findClientEcheance } from "@/lib/client-echeances"

const ECHEANCE_ID_RE = /^(decennale:\d+|avenant:[a-z0-9]+|attestation:[a-z0-9]+)$/i

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { id: userId } = await params
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
    const action = raw.action === "carte" || raw.action === "regler" ? raw.action : null
    const echeanceId = typeof raw.echeanceId === "string" ? raw.echeanceId.trim() : ""
    if (!action || !ECHEANCE_ID_RE.test(echeanceId)) {
      return NextResponse.json({ error: "Échéance ou action invalide." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, raisonSociale: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const echeance = findClientEcheance(await loadClientEcheances(userId), echeanceId)
    if (!echeance) {
      return NextResponse.json({ error: "Échéance introuvable." }, { status: 404 })
    }
    if (echeance.paid) {
      return NextResponse.json({ ok: true, alreadyPaid: true, echeances: await loadClientEcheances(userId) })
    }
    if (!(echeance.amount > 0)) {
      return NextResponse.json({ error: "Montant d'échéance invalide." }, { status: 400 })
    }

    const email = user.email.trim().toLowerCase()
    const raisonSociale = user.raisonSociale || email
    const metadata: Record<string, string> = {
      type: action === "carte" ? "echeance_carte" : "echeance_manuelle",
      echeanceId: echeance.id,
      userId: user.id,
      email,
      raisonSociale,
    }
    if (echeance.installmentNumber) metadata.installmentNumber = String(echeance.installmentNumber)
    if (echeance.sepaSubscriptionId) metadata.sepaSubscriptionId = echeance.sepaSubscriptionId
    if (echeance.avenantFeeId) metadata.avenantFeeId = echeance.avenantFeeId
    if (echeance.attestationId) metadata.attestationId = echeance.attestationId

    if (action === "regler") {
      const paymentId = `manuel_${randomUUID()}`
      await prisma.payment.create({
        data: {
          userId: user.id,
          molliePaymentId: paymentId,
          amount: echeance.amount,
          status: "paid",
          paidAt: new Date(),
          metadata: JSON.stringify(metadata),
        },
      })
      await applyEcheancePaidEffects(metadata)
      await logAdminActivity({
        adminEmail: session.user.email,
        action: "echeance_marquee_reglee",
        targetType: "user",
        targetId: user.id,
        details: { echeanceId: echeance.id, amount: echeance.amount, paymentId },
      })
      return NextResponse.json({ ok: true, echeances: await loadClientEcheances(userId) })
    }

    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Mollie non configuré" }, { status: 500 })
    }

    const baseUrl = getMolliePublicBaseUrl()
    const mollie = createMollieClient({ apiKey })
    const payment = await mollie.payments.create({
      amount: { currency: "EUR", value: echeance.amount.toFixed(2) },
      description: `${echeance.label} — carte — ${raisonSociale}`,
      redirectUrl: `${baseUrl}/espace-client`,
      webhookUrl: `${baseUrl}/api/mollie/webhook`,
      method: PaymentMethod.creditcard,
      locale: Locale.fr_FR,
      metadata,
    })
    const checkoutUrl = payment._links?.checkout?.href
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Mollie n'a pas renvoyé de lien de paiement." }, { status: 502 })
    }

    const template = EMAIL_TEMPLATES.paiementEcheanceCarte(
      raisonSociale,
      echeance.label,
      echeance.amount,
      checkoutUrl,
      email
    )
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })

    await logAdminActivity({
      adminEmail: session.user.email,
      action: "echeance_lien_carte",
      targetType: "user",
      targetId: user.id,
      details: { echeanceId: echeance.id, amount: echeance.amount, paymentId: payment.id, emailSent: sent },
    })

    if (!sent) {
      return NextResponse.json({
        ...emailNotSentBody(),
        checkoutUrl,
        amount: echeance.amount,
        paymentId: payment.id,
      })
    }

    return NextResponse.json({
      ok: true,
      sentTo: email,
      amount: echeance.amount,
      paymentId: payment.id,
      checkoutUrl,
    })
  } catch (error) {
    console.error("[gestion/clients/echeances]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
