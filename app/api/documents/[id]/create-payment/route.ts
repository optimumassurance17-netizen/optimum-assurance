import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createMollieClient } from "@mollie/api-client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Crée un paiement Mollie pour un document devis_do.
 * Paiement unique par carte bancaire.
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const mollieClient = createMollieClient({ apiKey })
    const payment = await mollieClient.payments.create({
      amount: { currency: "EUR", value: String(amount.toFixed(2)) },
      description: `Dommage ouvrage - Devis ${document.numero} - ${document.user.raisonSociale || document.user.email}`,
      redirectUrl: `${baseUrl}/confirmation`,
      webhookUrl: `${baseUrl}/api/mollie/webhook`,
      metadata: {
        type: "devis_do",
        documentId: document.id,
        documentNumero: document.numero,
        email: document.user.email,
        raisonSociale: document.user.raisonSociale || "",
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
