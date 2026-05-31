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

    const [documents, payments, contractPayments, activeContractsWithCertificate] = await Promise.all([
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
      prisma.contractLifecyclePayment.findMany({
        where: {
          contract: { userId: session.user.id },
        },
        select: { amount: true, status: true, paidAt: true, createdAt: true },
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

    const attestations = documents.filter((d) => d.type === "attestation" || d.type === "attestation_do")
    /** Impayé / régularisation : uniquement attestations décennale (le DO est payé avant délivrance). */
    const suspendedCount = documents.filter(
      (d) => isDecennaleAttestationType(d.type) && d.status === "suspendu"
    ).length
    const allPayments = [
      ...payments.map((payment) => ({
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.paidAt ?? null,
      })),
      ...contractPayments.map((payment) => ({
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      })),
    ]
    const paidRows = allPayments.filter((payment) => payment.status === "paid")
    const paidTotal = paidRows.reduce((acc, payment) => acc + payment.amount, 0)
    const lastPayment =
      paidRows
        .slice()
        .sort((a, b) => {
          const aTime = new Date(a.paidAt ?? a.createdAt ?? 0).getTime()
          const bTime = new Date(b.paidAt ?? b.createdAt ?? 0).getTime()
          return bTime - aTime
        })[0] ?? null

    return NextResponse.json({
      documentsCount: documents.length,
      attestationsCount: attestations.length + activeContractsWithCertificate,
      suspendedCount,
      paymentsCount: payments.length + contractPayments.length,
      paidTotal,
      lastPayment,
    })
  } catch (error) {
    console.error("Erreur summary client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
