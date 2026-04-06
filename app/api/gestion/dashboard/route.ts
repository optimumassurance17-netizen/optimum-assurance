import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

/** Message utilisateur + code Prisma pour le support (logs Vercel). */
function errorPayloadForDashboard(error: unknown): { error: string; prismaCode?: string; debugMessage?: string } {
  let prismaCode: string | undefined
  let message =
    "Impossible de charger le tableau de bord. Consultez les logs Vercel (fonction /api/gestion/dashboard)."

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    prismaCode = error.code
    if (error.code === "P1001" || error.code === "P1002") {
      message =
        "Connexion à la base de données refusée ou serveur injoignable. Vérifiez DATABASE_URL sur Vercel et que Postgres (Supabase) autorise les connexions depuis Vercel."
    } else if (error.code === "P1017") {
      message =
        "La connexion à la base a été fermée (souvent timeout). Réessayez dans un instant."
    } else if (error.code === "P2021") {
      message =
        "Table absente : appliquez les migrations Prisma sur cette base (npx prisma migrate deploy sur l’URL de prod)."
    } else if (error.code === "P2022") {
      message =
        "Colonne absente : le schéma Prisma ne correspond pas à la base — migrations à jour ?"
    }
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    prismaCode = error.errorCode
    message =
      "Client base de données non initialisé : DATABASE_URL manquant, invalide ou base inaccessible."
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    message = "Erreur interne du moteur Prisma. Relancez le déploiement ou vérifiez les logs Vercel."
  }

  const out: { error: string; prismaCode?: string; debugMessage?: string } = { error: message }
  if (prismaCode) out.prismaCode = prismaCode
  if (process.env.NODE_ENV === "development" && error instanceof Error && error.message) {
    out.debugMessage = error.message
  }
  return out
}

/** Vercel Pro : jusqu’à 60 s ; Hobby plafonne souvent à 10 s. */
export const maxDuration = 60

/** Limite les listes CRM pour éviter timeouts Vercel / réponses JSON énormes. */
const DASH_LIST_LIMIT = 3000
/** Pour le calcul des stats DO (sommes JSON) — plafond pour ne pas charger 100k lignes. */
const DO_STATS_ATTESTATIONS_CAP = 10_000

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
        take: DASH_LIST_LIMIT,
      }),
      prisma.document.findMany({
        include: { user: { select: { email: true, raisonSociale: true } } },
        orderBy: { createdAt: "desc" },
        take: DASH_LIST_LIMIT,
      }),
      prisma.payment.findMany({
        include: { user: { select: { email: true, raisonSociale: true } } },
        orderBy: { createdAt: "desc" },
        take: DASH_LIST_LIMIT,
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
        const [attestationsTotal, facturesCount, attestationsDo] = await Promise.all([
          prisma.document.count({ where: { type: "attestation_do" } }),
          prisma.document.count({ where: { type: { in: ["facture_do", "facture_decennale"] } } }),
          prisma.document.findMany({
            where: { type: "attestation_do" },
            select: { data: true },
            orderBy: { createdAt: "desc" },
            take: DO_STATS_ATTESTATIONS_CAP,
          }),
        ])
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
          attestationsCount: attestationsTotal,
          facturesCount,
          primesTotal,
          closCouvertCount,
          /** Sur l’échantillon chargé (plafonné), cohérent avec primes / clos. */
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
    const body = errorPayloadForDashboard(error)
    return NextResponse.json(body, { status: 500 })
  }
}
