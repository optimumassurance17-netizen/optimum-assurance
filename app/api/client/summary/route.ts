import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isDecennaleAttestationType } from "@/lib/decennale-impaye"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const [documents, payments, activeContractsWithCertificate] = await Promise.all([
      prisma.document.findMany({
        where: { userId: session.user.id },
        select: { type: true, status: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { userId: session.user.id },
        select: { amount: true, status: true, paidAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.insuranceContract.count({
        where: {
          userId: session.user.id,
          status: "active",
          storedDocuments: {
            some: { type: "certificate" },
          },
        },
      }),
    ])

    const attestations = documents.filter(
      (d) =>
        d.type === "attestation" ||
        d.type === "attestation_do" ||
        d.type === "attestation_nominative"
    )
    /** Impayé / régularisation : uniquement attestations décennale (le DO est payé avant délivrance). */
    const suspendedCount = documents.filter(
      (d) => isDecennaleAttestationType(d.type) && d.status === "suspendu"
    ).length
    const paidTotal = payments.filter((p) => p.status === "paid").reduce((acc, p) => acc + p.amount, 0)

    return NextResponse.json({
      documentsCount: documents.length,
      attestationsCount: attestations.length + activeContractsWithCertificate,
      suspendedCount,
      paymentsCount: payments.length,
      paidTotal,
      lastPayment: payments.find((p) => p.status === "paid"),
    })
  } catch (error) {
    console.error("Erreur summary client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
