import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isDecennaleAttestationType } from "@/lib/decennale-impaye"

function isPaidStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase()
  return normalized === "paid" || normalized === "completed" || normalized === "succeeded"
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const [documents, payments, lifecyclePayments, activeContractsWithCertificate] = await Promise.all([
      prisma.document.findMany({
        where: { userId: session.user.id },
        select: { type: true, status: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { userId: session.user.id },
        select: { molliePaymentId: true, amount: true, status: true, paidAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contractLifecyclePayment.findMany({
        where: { contract: { userId: session.user.id } },
        select: { molliePaymentId: true, amount: true, status: true, paidAt: true, createdAt: true },
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
    const seenMollieIds = new Set<string>()
    const unifiedPayments = [
      ...payments.map((row) => {
        if (row.molliePaymentId) seenMollieIds.add(row.molliePaymentId)
        return row
      }),
      ...lifecyclePayments.filter((row) => !row.molliePaymentId || !seenMollieIds.has(row.molliePaymentId)),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const paidPayments = unifiedPayments.filter((p) => isPaidStatus(p.status))
    const paidTotal = paidPayments.reduce((acc, p) => acc + p.amount, 0)
    const lastPaidPayment = paidPayments
      .slice()
      .sort((a, b) => {
        const aRef = (a.paidAt ?? a.createdAt).getTime()
        const bRef = (b.paidAt ?? b.createdAt).getTime()
        return bRef - aRef
      })[0]

    return NextResponse.json({
      documentsCount: documents.length,
      attestationsCount: attestations.length + activeContractsWithCertificate,
      suspendedCount,
      paymentsCount: unifiedPayments.length,
      paidTotal,
      lastPayment: lastPaidPayment
        ? {
            amount: lastPaidPayment.amount,
            paidAt: (lastPaidPayment.paidAt ?? lastPaidPayment.createdAt).toISOString(),
          }
        : undefined,
    })
  } catch (error) {
    console.error("Erreur summary client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
