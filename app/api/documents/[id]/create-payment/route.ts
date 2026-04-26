import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createMollieClient, Locale, PaymentMethod } from "@mollie/api-client"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  assertRecentDdaConsent,
  buildDdaNeedsSummary,
  buildDdaSuitabilityStatement,
  normalizeDdaProduct,
} from "@/lib/dda-compliance"

/**
 * Crée un paiement Mollie pour un document devis_do.
 * Uniquement virement bancaire (`banktransfer`) — pas de CB, pas de SEPA direct sur ce flux.
 * @see https://docs.mollie.com/payments/bank-transfer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Mollie non configuré (MOLLIE_API_KEY manquant)" },
        { status: 503 }
      )
    }

    const { id: documentId } = await params

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: session.user.id, type: "devis_do" },
      include: { user: { select: { email: true, raisonSociale: true } } },
    })

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const data = JSON.parse(document.data) as {
      primeAnnuelle: number
      fraisGestion?: number
      fraisCourtage?: number
      address?: string
      projectName?: string
      projectAddress?: string
      constructionNature?: string
    }

    const primeAnnuelle = Number(data.primeAnnuelle) || 0
    const fraisGestion = Number(data.fraisGestion) || 0
    const fraisCourtage = Number(data.fraisCourtage) || 0
    const amount = Math.round((primeAnnuelle + fraisGestion + fraisCourtage) * 100) / 100

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Montant invalide" },
        { status: 400 }
      )
    }

    const email = document.user.email?.trim()
    if (!email) {
      return NextResponse.json(
        { error: "Email requis pour le paiement par virement (Mollie envoie les instructions)" },
        { status: 400 }
      )
    }

    const produit = normalizeDdaProduct("dommage-ouvrage")
    if (!produit) {
      return NextResponse.json({ error: "Produit DDA invalide" }, { status: 500 })
    }
    const recentDda = await assertRecentDdaConsent({
      userId: session.user.id,
      email,
      produit,
      maxAgeHours: 72,
      allowedPages: ["paiement_do", "souscription_do", "formulaire_do"],
    })
    if (!recentDda.ok) {
      return NextResponse.json(
        {
          error:
            "Validation DDA requise : confirmez le devoir de conseil avant de poursuivre le paiement.",
          code: "DDA_CONSENT_REQUIRED",
        },
        { status: 412 }
      )
    }

    const besoins = buildDdaNeedsSummary({
      productType: produit,
      clientName: document.user.raisonSociale || "Client dommage-ouvrage",
      address: data.address,
      projectName: data.projectName || "Opération dommage-ouvrage",
      projectAddress: data.projectAddress,
      premium: amount,
    })
    const adequation = buildDdaSuitabilityStatement({
      productType: produit,
      matchedActivities: data.constructionNature ? [data.constructionNature] : [],
      missingActivitiesCount: 0,
      riskReasons: [],
      exclusions: ["techniques_non_courantes_non_validees", "travaux_non_declares"],
      sourcePage: recentDda.log.page,
    })

    const baseUrl = getMolliePublicBaseUrl()

    /** Échéance du virement (entre demain et J+100, exigence Mollie) */
    const due = new Date()
    due.setDate(due.getDate() + 14)
    const dueDate = due.toISOString().slice(0, 10)

    const mollieClient = createMollieClient({ apiKey })
    const payment = await mollieClient.payments.create({
      amount: { currency: "EUR", value: String(amount.toFixed(2)) },
      description: `Dommage ouvrage - Devis ${document.numero} - ${document.user.raisonSociale || email}`,
      redirectUrl: `${baseUrl}/confirmation`,
      webhookUrl: `${baseUrl}/api/mollie/webhook`,
      method: PaymentMethod.banktransfer,
      locale: Locale.fr_FR,
      billingEmail: email,
      dueDate,
      metadata: {
        type: "devis_do",
        documentId: document.id,
        documentNumero: document.numero,
        userId: session.user.id,
        email,
        raisonSociale: document.user.raisonSociale || "",
      },
    })

    await prisma.adminActivityLog.create({
      data: {
        adminEmail: "dda@system",
        action: "dda_do_payment_suitability_checked",
        targetType: "document",
        targetId: document.id,
        details: JSON.stringify({
          product: produit,
          consentLogId: recentDda.logId,
          needs: besoins,
          suitability: adequation,
          amount,
          paymentId: payment.id,
        }),
      },
    })

    return NextResponse.json({
      id: payment.id,
      checkoutUrl: payment._links?.checkout?.href,
      amount,
    })
  } catch (error) {
    console.error("Erreur création paiement DO:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    )
  }
}
