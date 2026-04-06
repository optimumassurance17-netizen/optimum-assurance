import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const [
      users,
      documents,
      payments,
      avenantFees,
      devisDoLeads,
      devisEtudeLeads,
      resiliationLogs,
      adminActivityLogs,
      resiliationRequests,
      doStats,
      devisLeads,
      devisDrafts,
      pendingSignaturesRaw,
      insuranceContractsCount,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          raisonSociale: true,
          siret: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.document.findMany({
        include: { user: { select: { email: true, raisonSociale: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        include: { user: { select: { email: true, raisonSociale: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.avenantFee.findMany({
        where: { status: "pending" },
        include: { user: { select: { email: true, raisonSociale: true } } },
      }),
      prisma.devisDommageOuvrageLead.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.devisEtudeLead.findMany({
        where: { statut: "pending" },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.resiliationLog.findMany({
        include: {
          document: {
            include: { user: { select: { email: true, raisonSociale: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.adminActivityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.resiliationRequest.findMany({
        where: { status: "pending" },
        include: {
          document: {
            include: { user: { select: { email: true, raisonSociale: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      (async () => {
        const attestationsDo = await prisma.document.findMany({
          where: { type: "attestation_do" },
          select: { data: true },
        })
        let primesTotal = 0
        let closCouvertCount = 0
        for (const d of attestationsDo) {
          try {
            const data = JSON.parse(d.data) as { primeAnnuelle?: number; closCouvert?: boolean }
            primesTotal += data.primeAnnuelle ?? 0
            if (data.closCouvert === true) closCouvertCount++
          } catch {
            /* ignore */
          }
        }
        return {
          attestationsCount: attestationsDo.length,
          facturesCount: await prisma.document.count({ where: { type: "facture_do" } }),
          primesTotal,
          closCouvertCount,
          doCompletCount: attestationsDo.length - closCouvertCount,
        }
      })(),
      prisma.devisLead.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.devisDraft.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          token: true,
          email: true,
          produit: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      prisma.pendingSignature.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.insuranceContract.count(),
    ])

    const pendingUserIds = [...new Set(pendingSignaturesRaw.map((p) => p.userId))]
    const pendingUsers =
      pendingUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: pendingUserIds } },
            select: { id: true, email: true, raisonSociale: true },
          })
        : []
    const pendingUserById = Object.fromEntries(pendingUsers.map((u) => [u.id, u]))
    const pendingSignatures = pendingSignaturesRaw.map((p) => ({
      id: p.id,
      signatureRequestId: p.signatureRequestId,
      contractNumero: p.contractNumero,
      createdAt: p.createdAt,
      userId: p.userId,
      user: pendingUserById[p.userId] ?? null,
    }))

    return NextResponse.json({
      users,
      documents,
      payments,
      avenantFees,
      devisDoLeads,
      devisEtudeLeads,
      resiliationLogs,
      resiliationRequests,
      adminActivityLogs,
      doStats,
      devisLeads,
      devisDrafts,
      pendingSignatures,
      insuranceContractsCount,
    })
  } catch (error) {
    console.error("Erreur dashboard gestion:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
