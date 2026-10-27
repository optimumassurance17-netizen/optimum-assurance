import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { syncContratAvenantDocumentsFromUser } from "@/lib/sync-user-document-identity"
import { asJsonObject } from "@/lib/json-object"
import { fetchUserDocumentReviews } from "@/lib/user-document-review"
import { collapseDecennaleContractDuplicates } from "@/lib/decennale-contract-replacement"
import { isDecennaleContractData, parseJsonObject } from "@/lib/decennale-contract-data"
import { LOCAL_SIGNED_DOCUMENT_TYPE } from "@/lib/esign/local-signature-fallback"
import { extractStructuredActivities } from "@/lib/activity-hierarchy-format"
import {
  CLIENT_DEVIS_AUTONOMY_ACTION,
  getClientDevisAutonomyConfig,
  normalizeForcedActivitiesInput,
} from "@/lib/client-devis-autonomy"
import { loadClientEcheances } from "@/lib/client-echeance-service"
import { clientDeleteErrorMessage, deleteClientAccount } from "@/lib/client-account"
import { purgeClientExternalResidue } from "@/lib/purge-client-residue"
import { describeSepaReadiness } from "@/lib/sepa-readiness"
import { attachSepaNotices, clientPaymentStatusLabel, collapseSettledCardLinkPayments, paymentEcheanceLabel, paymentMethodLabel, virementReferenceFromMetadata } from "@/lib/client-echeances"
import { describeClientActivity } from "@/lib/admin-activity-label"
import { DDA_AUDIT_ACTIONS } from "@/lib/dda-labels"
import { DOCUMENT_REQUEST_ACTION, readStoredDocumentRequest } from "@/lib/document-request"
import { sortRequestsByArrival } from "@/lib/devis-do-lead"
import { describeClientSignature } from "@/lib/signature-reminder"
import {
  DOCUMENT_DEVIS_EDITION_ACTION,
  collectDocumentDevisEditionDecisions,
  describeDocumentDevisEdition,
  isPerDocumentDevisEditionType,
} from "@/lib/devis-edition"
import { SITE_URL } from "@/lib/site-url"

function parseLogDetails(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function isSchemaDriftError(error: unknown, identifiers: string[] = []): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    if (identifiers.length === 0) return true
    const message = error.message.toLowerCase()
    return identifiers.some((identifier) => message.includes(identifier.toLowerCase()))
  }
  return false
}

async function withSchemaDriftFallback<T>(fn: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isSchemaDriftError(error)) {
      return fallbackValue
    }
    throw error
  }
}

async function fetchClientUserWithOptionalTitleQuestionnaires(id: string) {
  try {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        raisonSociale: true,
        siret: true,
        adresse: true,
        codePostal: true,
        ville: true,
        telephone: true,
        createdAt: true,
        doInitialQuestionnaireJson: true,
        doEtudeQuestionnaireJson: true,
        titleInitialQuestionnaireJson: true,
        titleEtudeQuestionnaireJson: true,
      },
    })
  } catch (error) {
    if (
      isSchemaDriftError(error, ["titleinitialquestionnairejson", "titleetudequestionnairejson"])
    ) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          raisonSociale: true,
          siret: true,
          adresse: true,
          codePostal: true,
          ville: true,
          telephone: true,
          createdAt: true,
          doInitialQuestionnaireJson: true,
          doEtudeQuestionnaireJson: true,
        },
      })
      return user
        ? {
            ...user,
            titleInitialQuestionnaireJson: null,
            titleEtudeQuestionnaireJson: null,
          }
        : null
    }
    throw error
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params

    const user = await fetchClientUserWithOptionalTitleQuestionnaires(id)

    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    await collapseDecennaleContractDuplicates({ userId: id })

    const [documents, payments, avenantFees, notes, sinistres, userDocuments, insuranceContracts, devoirConseilLogs, devisAutonomy, rcFabriquantLeads] =
      await Promise.all([
      prisma.document.findMany({
        where: { userId: id, type: { not: LOCAL_SIGNED_DOCUMENT_TYPE } },
        select: { id: true, type: true, numero: true, status: true, createdAt: true, data: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { userId: id },
        select: { id: true, amount: true, status: true, paidAt: true, createdAt: true, metadata: true, molliePaymentId: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.avenantFee.findMany({
        where: { userId: id },
        select: { id: true, amount: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientNote.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sinistre.findMany({
        where: { userId: id },
        include: { userDocument: { select: { id: true, filename: true, type: true } } },
        orderBy: { dateSinistre: "desc" },
      }),
      prisma.userDocument.findMany({
        where: { userId: id },
        select: { id: true, type: true, filename: true, size: true, createdAt: true },
        orderBy: { type: "asc" },
      }),
      withSchemaDriftFallback(
        () =>
          prisma.insuranceContract.findMany({
            where: { userId: id },
            select: {
              id: true,
              contractNumber: true,
              productType: true,
              createdAt: true,
              status: true,
              premium: true,
              paidAt: true,
              clientName: true,
              siret: true,
              address: true,
              activitiesJson: true,
              projectName: true,
              projectAddress: true,
              constructionNature: true,
              storedDocuments: {
                where: { type: "certificate" },
                take: 1,
                select: { id: true },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
        []
      ),
      withSchemaDriftFallback(
        () =>
          prisma.devoirConseilLog.findMany({
            where: {
              OR: [{ userId: id }, { email: user.email.trim().toLowerCase() }],
            },
            select: { id: true, email: true, userId: true, page: true, produit: true, acceptedAt: true },
            orderBy: { acceptedAt: "desc" },
            take: 60,
          }),
        []
      ),
      withSchemaDriftFallback(() => getClientDevisAutonomyConfig(id), {
        allowDevisEdition: false,
        allowForcedActivities: false,
        forcedActivities: [],
        note: null,
        updatedAt: null,
        updatedBy: null,
      }),
      withSchemaDriftFallback(async () => {
        const email = user.email.trim()
        if (!email) return []
        return prisma.devisRcFabriquantLead.findMany({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { id: true },
        })
      }, []),
    ])

    const contractById = new Map(insuranceContracts.map((c) => [c.id, c] as const))
    const documentById = new Map(documents.map((d) => [d.id, d] as const))
    const devoirConseilIds = devoirConseilLogs.map((row) => row.id)
    const insuranceContractIds = insuranceContracts.map((row) => row.id)
    const documentIds = documents.map((row) => row.id)

    const ddaScopes: { targetType: string; targetId: { in: string[] } }[] = []
    if (devoirConseilIds.length > 0) {
      ddaScopes.push({ targetType: "devoir_conseil_log", targetId: { in: devoirConseilIds } })
    }
    if (insuranceContractIds.length > 0) {
      ddaScopes.push({ targetType: "insurance_contract", targetId: { in: insuranceContractIds } })
    }
    if (documentIds.length > 0) {
      ddaScopes.push({ targetType: "document", targetId: { in: documentIds } })
    }
    const rcFabriquantLeadIds = rcFabriquantLeads.map((row) => row.id)
    if (rcFabriquantLeadIds.length > 0) {
      ddaScopes.push({ targetType: "DevisRcFabriquantLead", targetId: { in: rcFabriquantLeadIds } })
    }

    const ddaAuditLogs =
      ddaScopes.length > 0
        ? await withSchemaDriftFallback(
            () =>
              prisma.adminActivityLog.findMany({
                where: {
                  action: { in: [...DDA_AUDIT_ACTIONS] },
                  OR: ddaScopes,
                },
                select: {
                  id: true,
                  adminEmail: true,
                  action: true,
                  targetType: true,
                  targetId: true,
                  details: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 120,
              }),
            []
          )
        : []

    const userDocumentReviews = await withSchemaDriftFallback(
      () => fetchUserDocumentReviews(userDocuments.map((d) => d.id)),
      {}
    )
    const echeances = await withSchemaDriftFallback(async () => {
      const [rows, notices] = await Promise.all([
        loadClientEcheances(id),
        prisma.adminActivityLog.findMany({
          where: { targetType: "user", targetId: id, action: "echeance_refus_sepa_prevenu" },
          select: { action: true, details: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 40,
        }),
      ])
      return attachSepaNotices(rows, notices)
    }, [])
    const sepa = await withSchemaDriftFallback(async () => {
      const subscription = await prisma.sepaSubscription.findUnique({
        where: { userId: id },
        select: {
          status: true,
          mollieMandateId: true,
          nextSepaDue: true,
          lastError: true,
          sepaPendingPaymentId: true,
          trimestresSepaPayes: true,
          primeAnnuelle: true,
        },
      })
      if (!subscription) return describeSepaReadiness(null)
      const pendingId = subscription.sepaPendingPaymentId?.trim() || ""
      const local = pendingId ? payments.find((payment) => payment.molliePaymentId === pendingId) : undefined
      return describeSepaReadiness({
        ...subscription,
        pendingLocalMetadata: local?.metadata ?? null,
      })
    }, describeSepaReadiness(null))
    const canGenerateDecennaleAttestation =
      insuranceContracts.some((contract) => contract.productType === "decennale") ||
      documents.some((document) => {
        if (document.type !== "contrat" || !isDecennaleContractData(document.data)) return false
        return extractStructuredActivities(parseJsonObject(document.data)).length > 0
      })
    const paymentsForClient = collapseSettledCardLinkPayments(payments).map((payment) => {
      const methodLabel = paymentMethodLabel(payment.metadata, payment.molliePaymentId)
      return {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        statusLabel: clientPaymentStatusLabel(payment.status, methodLabel, payment.metadata),
        methodLabel,
        echeanceLabel: paymentEcheanceLabel(payment.metadata),
        virementReference: virementReferenceFromMetadata(payment.metadata),
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      }
    })
    const editionLogs =
      documentIds.length === 0
        ? []
        : await withSchemaDriftFallback(
            () =>
              prisma.adminActivityLog.findMany({
                where: {
                  action: DOCUMENT_DEVIS_EDITION_ACTION,
                  targetType: "document",
                  targetId: { in: documentIds },
                },
                select: { targetId: true, details: true, createdAt: true },
                orderBy: { createdAt: "desc" },
              }),
            []
          )
    const editionDecisions = collectDocumentDevisEditionDecisions(editionLogs)
    const documentsForClient = documents.map((document) => {
      const edition = isPerDocumentDevisEditionType(document.type)
        ? describeDocumentDevisEdition({
            documentDecision: editionDecisions.get(document.id) ?? null,
            clientWide: devisAutonomy.allowDevisEdition,
          })
        : { allowed: false, source: "aucune" as const }
      return {
        id: document.id,
        type: document.type,
        numero: document.numero,
        status: document.status,
        createdAt: document.createdAt,
        allowDevisEdition: edition.allowed,
        devisEditionSource: edition.source,
      }
    })
    const doLead = await withSchemaDriftFallback(
      () =>
        prisma.devisDommageOuvrageLead.findFirst({
          where: { email: { equals: user.email.trim(), mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        }),
      null
    )
    const pendingSignatures = await withSchemaDriftFallback(
      () =>
        prisma.pendingSignature.findMany({
          where: { userId: id },
          select: { signatureRequestId: true, contractNumero: true, contractData: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      []
    )
    const pendingIds = pendingSignatures.map((row) => row.signatureRequestId)
    const activityDocumentIds = documentIds.slice(0, 40)
    const activityWhere: Prisma.AdminActivityLogWhereInput[] = [{ targetType: "user", targetId: id }]
    if (pendingIds.length > 0) {
      activityWhere.push({ targetType: "pending_signature", targetId: { in: pendingIds } })
    }
    if (activityDocumentIds.length > 0) {
      activityWhere.push({ targetType: "document", targetId: { in: activityDocumentIds } })
    }
    const [signatureReminderLogs, activityLogs] = await Promise.all([
      pendingIds.length === 0
        ? Promise.resolve([])
        : withSchemaDriftFallback(
            () =>
              prisma.adminActivityLog.findMany({
                where: {
                  OR: [
                    { action: "signature_relance_manuelle", targetType: "user", targetId: id },
                    {
                      action: "cron_signature_reminder_client_sent",
                      targetType: "pending_signature",
                      targetId: { in: pendingIds },
                    },
                  ],
                },
                select: { action: true, targetType: true, targetId: true, details: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 40,
              }),
            []
          ),
      withSchemaDriftFallback(
        () =>
          prisma.adminActivityLog.findMany({
            where: { OR: activityWhere },
            select: { id: true, action: true, adminEmail: true, details: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 12,
          }),
        []
      ),
    ])
    const signature = describeClientSignature({
      documents,
      insuranceContracts,
      pending: pendingSignatures,
      siteUrl: SITE_URL,
      reminderLogs: signatureReminderLogs,
    })
    const activity = describeClientActivity(activityLogs)
    const documentRequestLogs = await withSchemaDriftFallback(
      () =>
        prisma.adminActivityLog.findMany({
          where: { action: DOCUMENT_REQUEST_ACTION, targetType: "user", targetId: id },
          select: { id: true, adminEmail: true, details: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      []
    )
    const documentRequests = sortRequestsByArrival(
      documentRequestLogs.flatMap((log) => {
        const request = readStoredDocumentRequest(log)
        return request ? [request] : []
      })
    )

    return NextResponse.json({
      user,
      devisAutonomy,
      doLeadId: doLead?.id ?? null,
      documents: documentsForClient,
      canGenerateDecennaleAttestation,
      signature,
      activity,
      documentRequests,
      insuranceContracts: insuranceContracts.map(({ storedDocuments, paidAt, ...contract }) => ({
        ...contract,
        paidAt: paidAt ? paidAt.toISOString() : null,
        hasCertificate: storedDocuments.length > 0,
      })),
      payments: paymentsForClient,
      avenantFees,
      echeances,
      sepa,
      notes,
      sinistres,
      userDocuments,
      userDocumentReviews,
      dda: {
        consents: devoirConseilLogs.map((row) => ({
          id: row.id,
          email: row.email,
          userId: row.userId,
          page: row.page,
          produit: row.produit,
          acceptedAt: row.acceptedAt,
        })),
        events: ddaAuditLogs.map((row) => {
          let targetLabel: string | null = null
          if (row.targetType === "insurance_contract" && row.targetId) {
            const contract = contractById.get(row.targetId)
            targetLabel = contract ? `${contract.contractNumber} (${contract.productType})` : row.targetId
          } else if (row.targetType === "document" && row.targetId) {
            const document = documentById.get(row.targetId)
            targetLabel = document ? `${document.numero} (${document.type})` : row.targetId
          } else if (row.targetType === "devoir_conseil_log" && row.targetId) {
            targetLabel = `Log #${row.targetId.slice(-8)}`
          } else if (row.targetType === "DevisRcFabriquantLead" && row.targetId) {
            targetLabel = "Demande RC fabricant"
          }
          return {
            id: row.id,
            adminEmail: row.adminEmail,
            action: row.action,
            targetType: row.targetType,
            targetId: row.targetId,
            targetLabel,
            details: parseLogDetails(row.details),
            createdAt: row.createdAt,
          }
        }),
      },
    })
  } catch (error) {
    console.error("Erreur détail client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * PATCH — Mise à jour des coordonnées compte client (admin uniquement)
 * Body partiel :
 * - coordonnées: { raisonSociale?, email?, siret?, adresse?, codePostal?, ville?, telephone? }
 * - autonomie devis: { devisAutonomy?: { allowDevisEdition?, allowForcedActivities?, forcedActivities?, note? } }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const payload = body as Record<string, unknown>

    const current = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        raisonSociale: true,
        siret: true,
        adresse: true,
        codePostal: true,
        ville: true,
        telephone: true,
        createdAt: true,
      },
    })
    if (!current) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const data: {
      raisonSociale?: string | null
      siret?: string | null
      adresse?: string | null
      codePostal?: string | null
      ville?: string | null
      telephone?: string | null
      email?: string
    } = {}

    const opt = (v: unknown): string | null => {
      const s = String(v ?? "").trim()
      return s === "" ? null : s
    }

    if ("raisonSociale" in payload) data.raisonSociale = opt(payload.raisonSociale)
    if ("siret" in payload) data.siret = opt(payload.siret)
    if ("adresse" in payload) data.adresse = opt(payload.adresse)
    if ("codePostal" in payload) data.codePostal = opt(payload.codePostal)
    if ("ville" in payload) data.ville = opt(payload.ville)
    if ("telephone" in payload) data.telephone = opt(payload.telephone)

    if ("email" in payload) {
      const raw = String(payload.email ?? "").trim().toLowerCase()
      if (!raw) {
        return NextResponse.json({ error: "L'email ne peut pas être vide" }, { status: 400 })
      }
      if (!EMAIL_RE.test(raw)) {
        return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 })
      }
      if (raw !== current.email) {
        const taken = await prisma.user.findUnique({ where: { email: raw }, select: { id: true } })
        if (taken) {
          return NextResponse.json({ error: "Cet email est déjà utilisé par un autre compte" }, { status: 409 })
        }
      }
      data.email = raw
    }

    const autonomyRaw =
      "devisAutonomy" in payload &&
      payload.devisAutonomy &&
      typeof payload.devisAutonomy === "object" &&
      !Array.isArray(payload.devisAutonomy)
        ? (payload.devisAutonomy as Record<string, unknown>)
        : null

    const hasAutonomyUpdate = autonomyRaw !== null

    if (Object.keys(data).length === 0 && !hasAutonomyUpdate) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 })
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({
        where: { id },
        data,
        select: { id: true },
      })
    }
    const updated = await fetchClientUserWithOptionalTitleQuestionnaires(id)
    if (!updated) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const syncedDocuments =
      Object.keys(data).length > 0 ? await syncContratAvenantDocumentsFromUser(id) : 0

    if (Object.keys(data).length > 0) {
      await logAdminActivity({
        adminEmail: session.user.email || "admin",
        action: "user_update",
        targetType: "user",
        targetId: id,
        details: { keys: Object.keys(data), syncedDocuments },
      })
    }

    if (hasAutonomyUpdate && autonomyRaw) {
      const allowDevisEdition = Boolean(autonomyRaw.allowDevisEdition)
      const forcedActivities = normalizeForcedActivitiesInput(autonomyRaw.forcedActivities)
      const allowForcedActivities = Boolean(autonomyRaw.allowForcedActivities) && forcedActivities.length > 0
      const noteValue =
        typeof autonomyRaw.note === "string" && autonomyRaw.note.trim().length > 0
          ? autonomyRaw.note.trim()
          : null

      await logAdminActivity({
        adminEmail: session.user.email || "admin",
        action: CLIENT_DEVIS_AUTONOMY_ACTION,
        targetType: "user",
        targetId: id,
        details: {
          allowDevisEdition,
          allowForcedActivities,
          forcedActivities: allowForcedActivities ? forcedActivities : [],
          note: noteValue,
        },
      })
    }

    const devisAutonomy = await withSchemaDriftFallback(() => getClientDevisAutonomyConfig(id), {
      allowDevisEdition: false,
      allowForcedActivities: false,
      forcedActivities: [],
      note: null,
      updatedAt: null,
      updatedBy: null,
    })

    return NextResponse.json({ user: updated, syncedDocuments, devisAutonomy })
  } catch (error) {
    console.error("Erreur PATCH client:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
  }
}

/**
 * DELETE — Supprime le compte client, son espace (documents plateforme, paiements, GED, SEPA en base)
 * et les brouillons de signature liés. Les contrats assurance plateforme restent en base avec userId null.
 * Body : { confirmEmail: string } doit correspondre à l’email du client (insensible à la casse).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte administrateur." },
        { status: 400 }
      )
    }

    let body: Partial<{ confirmEmail?: string }> = {}
    try {
      body = asJsonObject<{ confirmEmail?: string }>(await request.json())
    } catch {
      /* empty body */
    }
    const confirmEmail = typeof body.confirmEmail === "string" ? body.confirmEmail.trim().toLowerCase() : ""

    const target = await prisma.user.findUnique({
      where: { id },
      select: { email: true },
    })
    if (!target) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }
    if (confirmEmail !== target.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Saisissez l'email exact du client pour confirmer la suppression." },
        { status: 400 }
      )
    }

    const gedFiles = await prisma.userDocument.findMany({
      where: { userId: id },
      select: { filepath: true },
    })

    const sepaMollie = await prisma.sepaSubscription.findUnique({
      where: { userId: id },
      select: { mollieCustomerId: true },
    })

    await deleteClientAccount(id)
    await purgeClientExternalResidue({
      gedFilepaths: gedFiles.map((row) => row.filepath),
      mollieCustomerId: sepaMollie?.mollieCustomerId ?? null,
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "user_delete",
      targetType: "user",
      targetId: id,
      details: { deletedEmail: target.email },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur DELETE client:", error)
    const message = clientDeleteErrorMessage(error)
    const status = message === "Client introuvable" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
