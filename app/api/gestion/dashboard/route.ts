import { NextResponse } from "next/server"
import { Prisma } from "@/lib/prisma-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { normalizeRcFabriquantLeadStatut } from "@/lib/rc-fabriquant-lead-statuts"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"

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

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function parseAdminLogDetails(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

function normalizeInternalPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/espace-client"
  return trimmed.slice(0, 512)
}

function buildClientLoginPath(productType: string): string {
  const destination =
    productType === "decennale"
      ? "/signature"
      : productType === "rc_fabriquant"
        ? "/espace-client/rcpro"
        : "/espace-client"
  return `/connexion?callbackUrl=${encodeURIComponent(destination)}`
}

function formatDdaProductLabel(productType: string): string {
  if (productType === "do") return "Dommage-ouvrage"
  if (productType === "rc_fabriquant") return "RC Fabriquant"
  return "Décennale"
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

function inferProductTypeFromDocumentData(rawData: string | null | undefined): "decennale" | "do" | "rc_fabriquant" {
  const data = parseJsonObject(rawData)
  const normalized = typeof data.insuranceProduct === "string"
    ? data.insuranceProduct.trim().toLowerCase()
    : typeof data.productType === "string"
      ? data.productType.trim().toLowerCase()
      : ""
  if (normalized === "do" || normalized === "dommage-ouvrage") return "do"
  if (normalized === "rc_fabriquant" || normalized === "rc-fabriquant") return "rc_fabriquant"
  return "decennale"
}

function parseLeadCompanyName(rawData: string | null | undefined): string | null {
  const data = parseJsonObject(rawData)
  if (typeof data.raisonSociale === "string" && data.raisonSociale.trim()) {
    return data.raisonSociale.trim().slice(0, 160)
  }
  return null
}

function buildSchemaDriftFallbackDashboard() {
  return {
    users: [],
    documents: [],
    payments: [],
    avenantFees: [],
    devisDoLeads: [],
    devisRcFabriquantLeads: [],
    devisEtudeLeads: [],
    resiliationLogs: [],
    resiliationRequests: [],
    adminActivityLogs: [],
    doStats: {
      attestationsCount: 0,
      facturesCount: 0,
      primesTotal: 0,
      closCouvertCount: 0,
      doCompletCount: 0,
    },
    devisLeads: [],
    devisDrafts: [],
    pendingSignatures: [],
    insuranceContractsCount: 0,
    insuranceContracts: [],
    dashboardActions: [],
    dashboardActionsSummary: {
      total: 0,
      high: 0,
      medium: 0,
      overdue72h: 0,
      dismissedToday: 0,
    },
    warning:
      "Mode dégradé activé : certaines colonnes/tables Prisma manquent en base. Appliquez les migrations pour restaurer toutes les données du dashboard.",
  }
}

async function fetchDevisRcFabriquantLeadsSafe() {
  // Sélection minimale compatible avec les schémas plus anciens (sans colonnes WhatsApp).
  const rows = await prisma.devisRcFabriquantLead.findMany({
    select: {
      id: true,
      email: true,
      data: true,
      statut: true,
      notesInternes: true,
      primeProposee: true,
      propositionEnvoyeeAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return rows.map((row) => ({
    ...row,
    lastWhatsappClickAt: null,
    lastWhatsappSource: null,
    lastWhatsappRef: null,
  }))
}

async function fetchUsersDoQuestionnaireRowsSafe() {
  try {
    return await prisma.user.findMany({
      where: {
        OR: [{ doInitialQuestionnaireJson: { not: null } }, { doEtudeQuestionnaireJson: { not: null } }],
      },
      select: {
        id: true,
        doInitialQuestionnaireJson: true,
        doEtudeQuestionnaireJson: true,
      },
      take: DASH_LIST_LIMIT,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2022" || error.code === "P2021")
    ) {
      // Compatibilité temporaire si ces colonnes ne sont pas encore présentes en prod.
      return []
    }
    throw error
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }
    const now = new Date()
    const ddaConsentWindowStart = new Date(now.getTime() - 72 * 60 * 60 * 1000)
    const ddaEventWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      users,
      documents,
      payments,
      avenantFees,
      devisDoLeads,
      devisRcFabriquantLeads,
      devisEtudeLeads,
      resiliationLogs,
      adminActivityLogs,
      resiliationRequests,
      doStats,
      devisLeads,
      devisDrafts,
      pendingSignaturesRaw,
      sepaSubscriptions,
      insuranceContractsCount,
      insuranceContractsList,
      usersDoQuestionnaireRows,
      recentDdaConsents,
      recentDdaEvents,
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
      fetchDevisRcFabriquantLeadsSafe(),
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
      prisma.sepaSubscription.findMany({
        orderBy: { updatedAt: "desc" },
        take: 200,
        select: {
          id: true,
          userId: true,
          status: true,
          mollieCustomerId: true,
          mollieMandateId: true,
          primeAnnuelle: true,
          trimestresSepaPayes: true,
          firstTrimesterPaidAt: true,
          nextSepaDue: true,
          lastError: true,
          sepaPendingPaymentId: true,
          updatedAt: true,
        },
      }),
      prisma.insuranceContract.count(),
      prisma.insuranceContract.findMany({
        orderBy: { createdAt: "desc" },
        take: 150,
        select: {
          id: true,
          contractNumber: true,
          productType: true,
          clientName: true,
          userId: true,
          premium: true,
          status: true,
          paidAt: true,
          rejectedReason: true,
          validUntil: true,
          createdAt: true,
          user: { select: { id: true, email: true, raisonSociale: true } },
          lifecyclePayments: {
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              amount: true,
              status: true,
              paidAt: true,
              createdAt: true,
            },
          },
        },
      }),
      fetchUsersDoQuestionnaireRowsSafe(),
      prisma.devoirConseilLog.findMany({
        where: {
          acceptedAt: { gte: ddaConsentWindowStart },
        },
        select: {
          id: true,
          userId: true,
          email: true,
          produit: true,
          page: true,
          acceptedAt: true,
        },
        orderBy: { acceptedAt: "desc" },
        take: DASH_LIST_LIMIT,
      }),
      prisma.adminActivityLog.findMany({
        where: {
          createdAt: { gte: ddaEventWindowStart },
          action: {
            in: [
              "dda_advice_acknowledged",
              "dda_contract_suitability_checked",
              "dda_do_payment_suitability_checked",
              "dda_rc_fabriquant_initial_request_logged",
              "dda_rc_fabriquant_proposition_suitability_checked",
              "dda_rc_fabriquant_signature_suitability_checked",
              "dda_rc_fabriquant_contract_created_after_signature",
              "dda_avenant_suitability_checked",
              "dda_document_update_suitability_checked",
            ],
          },
        },
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          details: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: DASH_LIST_LIMIT,
      }),
    ])

    const doQuestionnaireByUserId = new Map<
      string,
      { doQuestionnaireInitial: boolean; doQuestionnaireEtude: boolean }
    >()
    for (const row of usersDoQuestionnaireRows) {
      doQuestionnaireByUserId.set(row.id, {
        doQuestionnaireInitial: Boolean(row.doInitialQuestionnaireJson?.trim()),
        doQuestionnaireEtude: Boolean(row.doEtudeQuestionnaireJson?.trim()),
      })
    }
    const usersWithDoFlags = users.map((u) => {
      const flags = doQuestionnaireByUserId.get(u.id)
      return {
        ...u,
        doQuestionnaireInitial: flags?.doQuestionnaireInitial ?? false,
        doQuestionnaireEtude: flags?.doQuestionnaireEtude ?? false,
      }
    })

    const pendingUserIds = [...new Set(pendingSignaturesRaw.map((p) => p.userId))]
    const sepaUserIds = [...new Set(sepaSubscriptions.map((s) => s.userId))]
    const pendingUsers =
      pendingUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: pendingUserIds } },
            select: { id: true, email: true, raisonSociale: true },
          })
        : []
    const sepaUsers =
      sepaUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: sepaUserIds } },
            select: { id: true, email: true, raisonSociale: true },
          })
        : []
    const pendingUserById = Object.fromEntries(pendingUsers.map((u) => [u.id, u]))
    const sepaUserById = Object.fromEntries(sepaUsers.map((u) => [u.id, u]))
    const pendingSignatures = pendingSignaturesRaw.map((p) => {
      let signatureFlow: "custom_pdf" | "decennale" = "decennale"
      let signatureFlowLabel: string | undefined
      const ageHours = Math.max(0, Math.floor((Date.now() - p.createdAt.getTime()) / (60 * 60 * 1000)))
      try {
        const j = JSON.parse(p.contractData || "{}") as Record<string, unknown>
        if (j.customUploadedDevisFlow === true) {
          signatureFlow = "custom_pdf"
          const pl = typeof j.produitLabel === "string" ? j.produitLabel.trim() : ""
          signatureFlowLabel = pl ? pl.slice(0, 120) : undefined
        }
      } catch {
        /* ignore */
      }
      return {
        id: p.id,
        signatureRequestId: p.signatureRequestId,
        contractNumero: p.contractNumero,
        createdAt: p.createdAt,
        userId: p.userId,
        user: pendingUserById[p.userId] ?? null,
        signatureFlow,
        signatureFlowLabel,
        ageHours,
        repairEligible: ageHours >= 24,
      }
    })
    const sepaSubscriptionsRows = sepaSubscriptions.map((s) => ({
      id: s.id,
      userId: s.userId,
      user: sepaUserById[s.userId] ?? null,
      status: s.status,
      mollieCustomerId: s.mollieCustomerId,
      mollieMandateId: s.mollieMandateId,
      primeAnnuelle: s.primeAnnuelle,
      trimestresSepaPayes: s.trimestresSepaPayes,
      firstTrimesterPaidAt: s.firstTrimesterPaidAt,
      nextSepaDue: s.nextSepaDue,
      lastError: s.lastError,
      sepaPendingPaymentId: s.sepaPendingPaymentId,
      updatedAt: s.updatedAt,
    }))

    const rcLeadEmails = [
      ...new Set(
        devisRcFabriquantLeads
          .map((lead) => lead.email.trim().toLowerCase())
          .filter((email) => email.length > 0)
      ),
    ]
    const rcLeadUsers =
      rcLeadEmails.length > 0
        ? await prisma.user.findMany({
            where: { email: { in: rcLeadEmails } },
            select: { id: true, email: true, raisonSociale: true },
          })
        : []
    const rcLeadUserByEmail = new Map(
      rcLeadUsers.map((u) => [u.email.trim().toLowerCase(), u] as const)
    )
    const rcLeadIds = devisRcFabriquantLeads.map((lead) => lead.id)
    const rcFabLeadActivityLogs =
      rcLeadIds.length > 0
        ? await prisma.adminActivityLog.findMany({
            where: {
              targetType: "DevisRcFabriquantLead",
              targetId: { in: rcLeadIds },
              action: { in: ["rc_fabriquant_proposition_email", "rc_fabriquant_etude_signature_sent"] },
            },
            orderBy: { createdAt: "desc" },
            select: { action: true, targetId: true, details: true, createdAt: true },
            take: 400,
          })
        : []
    const rcFabTraceByLeadId = new Map<
      string,
      {
        proposition?: { copySent: boolean; at: Date }
        signature?: { copySent: boolean; at: Date }
      }
    >()
    for (const log of rcFabLeadActivityLogs) {
      const leadId = typeof log.targetId === "string" ? log.targetId : ""
      if (!leadId) continue
      const current = rcFabTraceByLeadId.get(leadId) ?? {}
      const details = parseAdminLogDetails(log.details)
      const copySent = details.copySent === true
      if (log.action === "rc_fabriquant_proposition_email" && !current.proposition) {
        current.proposition = { copySent, at: log.createdAt }
      }
      if (log.action === "rc_fabriquant_etude_signature_sent" && !current.signature) {
        current.signature = { copySent, at: log.createdAt }
      }
      rcFabTraceByLeadId.set(leadId, current)
    }
    const devisRcFabriquantLeadsWithUser = devisRcFabriquantLeads.map((lead) => {
      const trace = rcFabTraceByLeadId.get(lead.id)
      const ageHours = Math.max(0, Math.floor((Date.now() - lead.createdAt.getTime()) / (60 * 60 * 1000)))
      return {
        ...lead,
        slaHours: ageHours,
        slaLevel: ageHours >= 72 ? "critical" : ageHours >= 24 ? "warning" : "ok",
        matchedUser: rcLeadUserByEmail.get(lead.email.trim().toLowerCase()) ?? null,
        copyTrace: trace
          ? {
              proposition: trace.proposition
                ? {
                    copySent: trace.proposition.copySent,
                    sentAt: trace.proposition.at.toISOString(),
                  }
                : null,
              signature: trace.signature
                ? {
                    copySent: trace.signature.copySent,
                    sentAt: trace.signature.at.toISOString(),
                  }
                : null,
            }
          : null,
      }
    })

    const todayStart = startOfUtcDay(now)
    const reminder24hMs = 24 * 60 * 60 * 1000
    const overdue72hMs = 72 * 60 * 60 * 1000
    const recentDdaConsentUserIds = new Set(
      recentDdaConsents.map((row) => (typeof row.userId === "string" ? row.userId : "")).filter(Boolean)
    )
    const recentDdaConsentEmails = new Set(
      recentDdaConsents
        .map((row) => (typeof row.email === "string" ? row.email.trim().toLowerCase() : ""))
        .filter(Boolean)
    )
    const ddaEventContractIds = new Set(
      recentDdaEvents
        .filter((row) => row.targetType === "insurance_contract" && typeof row.targetId === "string")
        .map((row) => row.targetId as string)
    )
    const ddaEventDocumentIds = new Set(
      recentDdaEvents
        .filter((row) => row.targetType === "document" && typeof row.targetId === "string")
        .map((row) => row.targetId as string)
    )
    const ddaEventLeadIds = new Set(
      recentDdaEvents
        .filter((row) => row.targetType === "DevisRcFabriquantLead" && typeof row.targetId === "string")
        .map((row) => row.targetId as string)
    )
    const recentDdaEventUserIds = new Set<string>()
    const recentDdaEventEmails = new Set<string>()
    for (const row of recentDdaEvents) {
      const details = parseAdminLogDetails(row.details)
      const uid = typeof details.userId === "string" ? details.userId.trim() : ""
      if (uid) recentDdaEventUserIds.add(uid)
      const emailCandidates = [
        typeof details.userEmail === "string" ? details.userEmail : "",
        typeof details.email === "string" ? details.email : "",
        typeof details.to === "string" ? details.to : "",
      ]
      for (const candidate of emailCandidates) {
        const normalized = candidate.trim().toLowerCase()
        if (normalized) recentDdaEventEmails.add(normalized)
      }
    }
    type DashboardAction = {
      id: string
      kind:
        | "signature_pending"
        | "approved_unpaid_contract"
        | "decennale_lead_followup"
        | "do_etude_pending"
        | "rc_fabriquant_pending"
        | "dda_proof_missing"
        | "dda_avenant_missing"
        | "dda_rc_fabriquant_missing"
      priority: "high" | "medium"
      title: string
      description: string
      href: string
      ageHours: number
      remediation?: {
        kind: "dda"
        toEmail: string
        clientLabel: string
        produitLabel: string
        ctaPath: string
        reference?: string
        missing?: string
      }
    }
    const dismissedLogs = await prisma.adminActivityLog.findMany({
      where: {
        action: "dashboard_action_dismissed",
        targetType: "dashboard_action",
        createdAt: { gte: todayStart },
      },
      select: { targetId: true },
    })
    const dismissedActionIds = new Set(
      dismissedLogs.map((l) => (typeof l.targetId === "string" ? l.targetId : "")).filter(Boolean)
    )

    const dashboardActions: DashboardAction[] = []

    for (const p of pendingSignaturesRaw) {
      const ageMs = now.getTime() - p.createdAt.getTime()
      if (ageMs < reminder24hMs) continue
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
      dashboardActions.push({
        id: `sig-${p.signatureRequestId}`,
        kind: "signature_pending",
        priority: ageMs >= overdue72hMs ? "high" : "medium",
        title: "Signature en attente",
        description: `Référence ${p.contractNumero} — ${ageHours}h`,
        href: "#signatures-attente",
        ageHours,
      })
    }

    for (const c of insuranceContractsList) {
      if (c.status !== "approved" || c.paidAt) continue
      const ageMs = now.getTime() - c.createdAt.getTime()
      if (ageMs < reminder24hMs) continue
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
      dashboardActions.push({
        id: `ctr-${c.id}`,
        kind: "approved_unpaid_contract",
        priority: ageMs >= overdue72hMs ? "high" : "medium",
        title: "Contrat approuvé non payé",
        description: `${c.contractNumber} (${c.productType}) — ${ageHours}h`,
        href: "#contrats-plateforme",
        ageHours,
      })
    }

    for (const d of devisLeads) {
      if (d.rappelSentAt) continue
      const ageMs = now.getTime() - d.createdAt.getTime()
      if (ageMs < reminder24hMs) continue
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
      dashboardActions.push({
        id: `lead-dec-${d.id}`,
        kind: "decennale_lead_followup",
        priority: ageMs >= overdue72hMs ? "high" : "medium",
        title: "Lead devis décennale à relancer",
        description: `${d.email} — ${ageHours}h`,
        href: "#leads-decennale",
        ageHours,
      })
    }

    for (const e of devisEtudeLeads) {
      if (e.statut !== "pending") continue
      const ageMs = now.getTime() - e.createdAt.getTime()
      if (ageMs < reminder24hMs) continue
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
      dashboardActions.push({
        id: `lead-etude-${e.id}`,
        kind: "do_etude_pending",
        priority: ageMs >= overdue72hMs ? "high" : "medium",
        title: "Demande étude à traiter",
        description: `${e.email} — ${ageHours}h`,
        href: "#etudes-do",
        ageHours,
      })
    }

    for (const l of devisRcFabriquantLeadsWithUser) {
      if (normalizeRcFabriquantLeadStatut(l.statut) !== "a_traiter") continue
      const ageMs = now.getTime() - l.createdAt.getTime()
      if (ageMs < reminder24hMs) continue
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
      dashboardActions.push({
        id: `lead-rcfab-${l.id}`,
        kind: "rc_fabriquant_pending",
        priority: ageMs >= overdue72hMs ? "high" : "medium",
        title: "Lead RC Fabriquant à traiter",
        description: `${l.email} — ${ageHours}h`,
        href: "#rc-fabriquant-leads",
        ageHours,
      })
    }

    for (const c of insuranceContractsList) {
      if (!["decennale", "do", "rc_fabriquant"].includes(c.productType)) continue
      if (c.status !== CONTRACT_STATUS.approved && c.status !== CONTRACT_STATUS.active) continue
      const ageMs = now.getTime() - c.createdAt.getTime()
      if (ageMs < reminder24hMs) continue
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
      const userId = c.user?.id ?? c.userId ?? ""
      const email = c.user?.email?.trim().toLowerCase() ?? ""
      const hasConsent =
        (userId && recentDdaConsentUserIds.has(userId)) || (email && recentDdaConsentEmails.has(email))
      const hasEvent =
        ddaEventContractIds.has(c.id) ||
        (userId && recentDdaEventUserIds.has(userId)) ||
        (email && recentDdaEventEmails.has(email))
      if (hasConsent && hasEvent) continue
      const missing = [
        hasConsent ? null : "consentement récent",
        hasEvent ? null : "trace d’adéquation",
      ]
        .filter(Boolean)
        .join(" + ")
      const produitLabel = formatDdaProductLabel(c.productType)
      const remediation =
        email && email.includes("@")
          ? {
              kind: "dda" as const,
              toEmail: email,
              clientLabel: (c.user?.raisonSociale || c.clientName || c.user?.email || email).trim(),
              produitLabel,
              ctaPath: normalizeInternalPath(buildClientLoginPath(c.productType)),
              reference: c.contractNumber,
              missing,
            }
          : undefined
      dashboardActions.push({
        id: `dda-contract-${c.id}`,
        kind: "dda_proof_missing",
        priority: ageMs >= overdue72hMs ? "high" : "medium",
        title: "DDA incomplète (contrat)",
        description: `${c.contractNumber} (${c.productType}) — manque: ${missing || "preuve"} — ${ageHours}h`,
        href: userId ? `/gestion/clients/${userId}` : "#contrats-plateforme",
        ageHours,
        remediation,
      })
    }

    for (const d of documents) {
      if (d.type !== "avenant") continue
      const ageMs = now.getTime() - d.createdAt.getTime()
      if (ageMs < reminder24hMs) continue
      if (ddaEventDocumentIds.has(d.id)) continue
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
      const productType = inferProductTypeFromDocumentData(d.data)
      const customerEmail = d.user?.email?.trim().toLowerCase()
      const customerLabel = (d.user?.raisonSociale || d.user?.email || "client").trim()
      const remediation =
        customerEmail && customerEmail.includes("@")
          ? {
              kind: "dda" as const,
              toEmail: customerEmail,
              clientLabel: customerLabel,
              produitLabel: formatDdaProductLabel(productType),
              ctaPath: normalizeInternalPath(buildClientLoginPath(productType)),
              reference: d.numero,
              missing: "trace d’adéquation DDA sur l’avenant",
            }
          : undefined
      dashboardActions.push({
        id: `dda-avenant-${d.id}`,
        kind: "dda_avenant_missing",
        priority: ageMs >= overdue72hMs ? "high" : "medium",
        title: "Avenant sans preuve DDA",
        description: `${d.numero} — ${(d.user?.raisonSociale || d.user?.email || "client")} — ${ageHours}h`,
        href: `/gestion/documents/${d.id}`,
        ageHours,
        remediation,
      })
    }

    for (const l of devisRcFabriquantLeadsWithUser) {
      const statut = normalizeRcFabriquantLeadStatut(l.statut)
      if (!["a_traiter", "en_cours", "proposition_envoyee"].includes(statut)) continue
      if (ddaEventLeadIds.has(l.id)) continue
      const ageMs = now.getTime() - l.createdAt.getTime()
      if (ageMs < reminder24hMs) continue
      const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
      const rcFabEmail = l.matchedUser?.email?.trim().toLowerCase() || l.email.trim().toLowerCase()
      const remediation =
        rcFabEmail && rcFabEmail.includes("@")
          ? {
              kind: "dda" as const,
              toEmail: rcFabEmail,
              clientLabel: (
                l.matchedUser?.raisonSociale ||
                parseLeadCompanyName(l.data) ||
                l.matchedUser?.email ||
                l.email
              ).trim(),
              produitLabel: "RC Fabriquant",
              ctaPath: normalizeInternalPath(buildClientLoginPath("rc_fabriquant")),
              missing: "consentement / traçabilité DDA du parcours RC Fabriquant",
            }
          : undefined
      dashboardActions.push({
        id: `dda-rcfab-${l.id}`,
        kind: "dda_rc_fabriquant_missing",
        priority: ageMs >= overdue72hMs ? "high" : "medium",
        title: "RC Fabriquant sans preuve DDA",
        description: `${l.email} — statut ${statut} — ${ageHours}h`,
        href: "#rc-fabriquant-leads",
        ageHours,
        remediation,
      })
    }

    const dashboardActionsVisible = dashboardActions.filter((a) => !dismissedActionIds.has(a.id))
    dashboardActionsVisible.sort((a, b) => b.ageHours - a.ageHours)
    const dashboardActionsLimited = dashboardActionsVisible.slice(0, 20)
    const dashboardActionsSummary = {
      total: dashboardActionsLimited.length,
      high: dashboardActionsLimited.filter((a) => a.priority === "high").length,
      medium: dashboardActionsLimited.filter((a) => a.priority === "medium").length,
      overdue72h: dashboardActionsLimited.filter((a) => a.ageHours >= 72).length,
      dismissedToday: dismissedActionIds.size,
    }

    const devisLeadsWithSla = devisLeads.map((lead) => {
      const slaHours = Math.max(0, Math.floor((Date.now() - lead.createdAt.getTime()) / (60 * 60 * 1000)))
      return {
        ...lead,
        slaHours,
        slaLevel: slaHours >= 72 ? "critical" : slaHours >= 24 ? "warning" : "ok",
      }
    })

    return NextResponse.json({
      users: usersWithDoFlags,
      documents,
      payments,
      avenantFees,
      devisDoLeads,
      devisRcFabriquantLeads: devisRcFabriquantLeadsWithUser,
      devisEtudeLeads,
      resiliationLogs,
      resiliationRequests,
      adminActivityLogs,
      doStats,
      devisLeads: devisLeadsWithSla,
      devisDrafts,
      pendingSignatures,
      sepaSubscriptions: sepaSubscriptionsRows,
      insuranceContractsCount,
      insuranceContracts: insuranceContractsList,
      dashboardActions: dashboardActionsLimited,
      dashboardActionsSummary,
    })
  } catch (error) {
    console.error("Erreur dashboard gestion:", error)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return NextResponse.json(buildSchemaDriftFallbackDashboard(), { status: 200 })
    }
    const body = errorPayloadForDashboard(error)
    return NextResponse.json(body, { status: 500 })
  }
}
