import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildSignatureSessionFromContrat } from "@/lib/decennale-session-from-contrat"
import { isDecennaleContractData, parseJsonObject } from "@/lib/decennale-contract-data"

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

    const sepa = await prisma.sepaSubscription.findUnique({
      where: { userId },
      select: { id: true, status: true },
    })
    if (sepa && sepa.status !== "cancelled") {
      return NextResponse.json({ available: false, reason: "sepa_deja_configure" })
    }

    const contrats = await prisma.document.findMany({
      where: { userId, type: "contrat" },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { numero: true, data: true },
    })
    if (contrats.length === 0) {
      return NextResponse.json({ available: false, reason: "pas_de_contrat" })
    }

    const contratsDecennale = contrats
      .map((contrat) => ({ numero: contrat.numero, data: parseJsonObject(contrat.data) }))
      .filter((contrat) => isDecennaleContractData(contrat.data))
    if (contratsDecennale.length === 0) {
      return NextResponse.json({ available: false, reason: "pas_de_contrat_decennale" })
    }
    const contratDecennale = contratsDecennale.find(
      (contrat) => Object.keys(contrat.data).length > 0
    )
    if (!contratDecennale) {
      return NextResponse.json({ available: false, reason: "donnees_invalides" })
    }

    const payments = await prisma.payment.findMany({
      where: { userId, status: "paid" },
      select: { metadata: true },
    })
    const aPayePremierTrimestre = payments.some((p) => {
      if (!p.metadata) return false
      try {
        const m = JSON.parse(p.metadata) as Record<string, unknown>
        return m.premierPaiementCarte === "true" || m.premierPaiementCarte === true
      } catch {
        return false
      }
    })
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

    const signaturePayload = buildSignatureSessionFromContrat(
      contratDecennale.data,
      contratDecennale.numero,
      user
    )

    return NextResponse.json({
      available: true,
      signaturePayload,
      contratNumero: contratDecennale.numero,
    })
  } catch (e) {
    console.error("[decennale-paiement-session]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
