import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isDecennaleAttestationType } from "@/lib/decennale-impaye"
import { requiredGeneratedDocTypesForContract } from "@/lib/insurance-contract-generated-documents"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const [
      documents,
      payments,
      contractPayments,
      generatedDocumentsCount,
      platformContractsForVirtualDocs,
    ] = await Promise.all([
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
      prisma.contractStoredDocument.count({
        where: {
          contract: { userId: session.user.id },
        },
      }),
      prisma.insuranceContract.findMany({
        where: {
          userId: session.user.id,
          productType: { in: ["do", "assurance_titre"] },
        },
        select: {
          productType: true,
          status: true,
          storedDocuments: { select: { type: true } },
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
    const virtualGeneratedDocsCount = platformContractsForVirtualDocs.reduce((total, contract) => {
      const existing = new Set(contract.storedDocuments.map((doc) => doc.type))
      const expected = requiredGeneratedDocTypesForContract(contract)
      return total + expected.filter((type) => !existing.has(type)).length
    }, 0)
    const activeContractsWithCertificate = platformContractsForVirtualDocs.filter(
      (contract) =>
        contract.status === "active" &&
        requiredGeneratedDocTypesForContract(contract).includes("certificate")
    ).length

    return NextResponse.json({
      documentsCount: documents.length + generatedDocumentsCount + virtualGeneratedDocsCount,
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
