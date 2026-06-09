import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  hasCurrentDecennaleFirstPayment,
  isSepaSubscriptionForCurrentDecennale,
} from "@/lib/decennale-payment-progress"
import { prisma } from "@/lib/prisma"
import { buildSignatureSessionFromContrat } from "@/lib/decennale-session-from-contrat"

/**
 * Indique si le client connecté peut poursuivre mandat SEPA + 1er paiement CB (décennale)
 * sans sessionStorage (ex. lien de signature envoyé depuis la gestion).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const userId = session.user.id

    const contrat = await prisma.document.findFirst({
      where: { userId, type: "contrat" },
      orderBy: { createdAt: "desc" },
      select: { numero: true, data: true, createdAt: true },
    })
    if (!contrat) {
      return NextResponse.json({ available: false, reason: "pas_de_contrat" })
    }

    let contratData: Record<string, unknown>
    try {
      contratData = JSON.parse(contrat.data || "{}") as Record<string, unknown>
    } catch {
      return NextResponse.json({ available: false, reason: "donnees_invalides" })
    }

    const [payments, sepa] = await Promise.all([
      prisma.payment.findMany({
        where: { userId, status: "paid" },
        select: { metadata: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.sepaSubscription.findUnique({
        where: { userId },
        select: {
          status: true,
          createdAt: true,
          firstTrimesterPaidAt: true,
        },
      }),
    ])

    const currentContract = {
      numero: contrat.numero,
      createdAt: contrat.createdAt,
    }
    const aPayePremierTrimestre =
      hasCurrentDecennaleFirstPayment(payments, currentContract) ||
      isSepaSubscriptionForCurrentDecennale(sepa, currentContract)
    if (aPayePremierTrimestre) {
      return NextResponse.json({ available: false, reason: "deja_paye" })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        raisonSociale: true,
        siret: true,
        adresse: true,
        codePostal: true,
        ville: true,
        telephone: true,
      },
    })
    if (!user) {
      return NextResponse.json({ available: false, reason: "utilisateur_introuvable" })
    }

    const signaturePayload = buildSignatureSessionFromContrat(contratData, contrat.numero, user)

    return NextResponse.json({
      available: true,
      signaturePayload,
      contratNumero: contrat.numero,
    })
  } catch (e) {
    console.error("[decennale-paiement-session]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
