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

    const [users, documents, payments, avenantFees, devisDoLeads, devisEtudeLeads, resiliationLogs, adminActivityLogs, resiliationRequests, doStats] = await Promise.all([
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
    ])

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
    })
  } catch (error) {
    console.error("Erreur dashboard gestion:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}
