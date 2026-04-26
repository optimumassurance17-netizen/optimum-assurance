import { existsSync } from "fs"
import { unlink } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import { createMollieClient } from "@mollie/api-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { syncContratAvenantDocumentsFromUser } from "@/lib/sync-user-document-identity"
import { getLocalGedPathCandidates, isGedSupabasePath } from "@/lib/user-documents"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { GED_SUPABASE_BUCKET } from "@/lib/user-documents"
import { asJsonObject } from "@/lib/json-object"
import { fetchUserDocumentReviews } from "@/lib/user-document-review"

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

    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const [documents, payments, avenantFees, notes, sinistres, userDocuments, insuranceContracts, devoirConseilLogs] =
      await Promise.all([
      prisma.document.findMany({
        where: { userId: id },
        select: { id: true, type: true, numero: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { userId: id },
        select: { id: true, amount: true, status: true, paidAt: true, createdAt: true },
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
      prisma.insuranceContract.findMany({
        where: { userId: id },
        select: { id: true, contractNumber: true, productType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.devoirConseilLog.findMany({
        where: {
          OR: [{ userId: id }, { email: user.email.trim().toLowerCase() }],
        },
        select: { id: true, email: true, userId: true, page: true, produit: true, acceptedAt: true },
        orderBy: { acceptedAt: "desc" },
        take: 60,
      }),
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

    const ddaAuditLogs =
      ddaScopes.length > 0
        ? await prisma.adminActivityLog.findMany({
            where: {
              action: {
                in: [
                  "dda_advice_acknowledged",
                  "dda_contract_suitability_checked",
                  "dda_do_payment_suitability_checked",
                ],
              },
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
          })
        : []

    const userDocumentReviews = await fetchUserDocumentReviews(
      userDocuments.map((d) => d.id)
    )

    return NextResponse.json({
      user,
      documents,
      payments,
      avenantFees,
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
 * Body partiel : { raisonSociale?, email?, siret?, adresse?, codePostal?, ville?, telephone? }
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

    const current = await prisma.user.findUnique({ where: { id } })
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

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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

    const syncedDocuments = await syncContratAvenantDocumentsFromUser(id)

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "user_update",
      targetType: "user",
      targetId: id,
      details: { keys: Object.keys(data), syncedDocuments },
    })

    return NextResponse.json({ user: updated, syncedDocuments })
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

    await prisma.$transaction(async (tx) => {
      await tx.pendingSignature.deleteMany({ where: { userId: id } })
      await tx.pdfGenerationLog.updateMany({ where: { userId: id }, data: { userId: null } })
      await tx.devoirConseilLog.updateMany({ where: { userId: id }, data: { userId: null } })
      await tx.user.delete({ where: { id } })
    })

    if (sepaMollie?.mollieCustomerId) {
      const apiKey = process.env.MOLLIE_API_KEY
      if (apiKey) {
        try {
          const mollie = createMollieClient({ apiKey })
          await mollie.customers.delete(sepaMollie.mollieCustomerId)
        } catch (e) {
          console.warn("[gestion] Mollie customers.delete après suppression client (non bloquant):", e)
        }
      }
    }

    const supabaseGedPaths = gedFiles
      .map((row) => row.filepath)
      .filter((path): path is string => isGedSupabasePath(path))
    if (supabaseGedPaths.length > 0) {
      const supabase = createSupabaseServiceClient()
      if (supabase) {
        try {
          await supabase.storage.from(GED_SUPABASE_BUCKET).remove(supabaseGedPaths)
        } catch (e) {
          console.warn("[gestion] suppression GED Supabase après delete user:", e)
        }
      }
    }

    for (const row of gedFiles) {
      if (isGedSupabasePath(row.filepath)) continue
      const candidates = getLocalGedPathCandidates(row.filepath)
      try {
        for (const fullPath of candidates) {
          if (existsSync(fullPath)) await unlink(fullPath)
        }
      } catch (e) {
        console.warn("[gestion] suppression fichier GED après delete user:", row.filepath, e)
      }
    }

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
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
  }
}
