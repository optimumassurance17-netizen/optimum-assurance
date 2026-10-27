import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { IDENTITY_DOC_KEYS, syncUserFromDocumentMergedData } from "@/lib/sync-user-document-identity"
import { DDA_LEGAL_VERSION, buildDdaNeedSummary } from "@/lib/dda-compliance"
import { stripSignatureBinaries } from "@/lib/esign/local-signature-fallback"
import { getDocumentDevisEdition } from "@/lib/document-devis-edition"
import {
  alignDoDevisStoredData,
  filterGestionDocumentPatch,
  documentSyncsAccountIdentity,
  isGestionEditableDocumentType,
  isPerDocumentDevisEditionType,
  overlayAccountIdentityOnDocument,
} from "@/lib/devis-edition"
import {
  ERRONEOUS_CONTRACT_DELETE_ACTION,
  isErroneousContractDocumentType,
} from "@/lib/erroneous-contract-delete"
import { Prisma } from "@/lib/prisma-client"

function parseDocumentData(value: string | null): Record<string, unknown> {
  try {
    return JSON.parse(value || "{}") as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * GET - Récupérer un document (admin uniquement, pour consultation)
 */
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

    const document = await prisma.document.findFirst({
      where: { id },
      include: { user: { select: { raisonSociale: true, email: true } } },
    })

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const data = overlayAccountIdentityOnDocument(
      document.type,
      stripSignatureBinaries(parseDocumentData(document.data)),
      document.user
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user, ...doc } = document
    const allowDevisEdition =
      document.userId && isPerDocumentDevisEditionType(document.type)
        ? await getDocumentDevisEdition({ documentId: document.id, userId: document.userId })
        : false
    return NextResponse.json({ ...doc, data, allowDevisEdition })
  } catch (error) {
    console.error("Erreur récupération document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Modification d'un devis, contrat ou avenant (admin uniquement).
 * Body: { data: { chiffreAffaires?, primeAnnuelle?, activites?, adresseOperation?, ... } }
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
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const modifications = (body as { data?: unknown }).data

    if (!modifications || typeof modifications !== "object") {
      return NextResponse.json({ error: "data requis (objet)" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { id },
    })

    if (!document || !isGestionEditableDocumentType(document.type)) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const currentData = parseDocumentData(document.data)
    const filteredModifications = filterGestionDocumentPatch(modifications)
    if (Object.keys(filteredModifications).length === 0) {
      return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 })
    }

    const mergedData = alignDoDevisStoredData(document.type, {
      ...currentData,
      ...filteredModifications,
    }, filteredModifications)

    await prisma.document.update({
      where: { id },
      data: { data: JSON.stringify(mergedData) },
    })

    const identityTouched = documentSyncsAccountIdentity(document.type)
      ? IDENTITY_DOC_KEYS.filter((k) => k in filteredModifications)
      : []
    if (identityTouched.length > 0) {
      const subset: Record<string, unknown> = {}
      for (const k of identityTouched) {
        subset[k] = mergedData[k]
      }
      const sync = await syncUserFromDocumentMergedData(document.userId, subset)
      if (!sync.ok) {
        await prisma.document.update({
          where: { id },
          data: { data: JSON.stringify(currentData) },
        })
        return NextResponse.json({ error: sync.error }, { status: sync.status })
      }
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "document_update",
      targetType: "document",
      targetId: id,
      details: { numero: document.numero, modifiedKeys: Object.keys(filteredModifications) },
    })

    // Avenants: tracer une preuve DDA structurée lors des modifications.
    if (document.type === "avenant") {
      const productRaw =
        typeof mergedData.insuranceProduct === "string"
          ? mergedData.insuranceProduct.trim().toLowerCase()
          : "decennale"
      const recommendedProduct =
        productRaw === "do" || productRaw === "dommage-ouvrage"
          ? "dommage-ouvrage"
          : productRaw === "rc_fabriquant" || productRaw === "rc-fabriquant"
            ? "rc-fabriquant"
            : "decennale"
      const activitiesCount = Array.isArray(mergedData.activites) ? mergedData.activites.length : undefined
      const turnover =
        typeof mergedData.chiffreAffaires === "number"
          ? mergedData.chiffreAffaires
          : typeof mergedData.chiffreAffaires === "string"
            ? Number(mergedData.chiffreAffaires.replace(",", ".").trim())
            : undefined

      await logAdminActivity({
        adminEmail: session.user.email || "admin",
        action: "dda_avenant_suitability_checked",
        targetType: "document",
        targetId: id,
        details: {
          version: DDA_LEGAL_VERSION,
          sourcePage: "gestion_avenant_update",
          sourcePath: `/gestion/documents/${id}`,
          recommendedProduct,
          needsSummary: buildDdaNeedSummary({
            insuranceProduct:
              recommendedProduct === "dommage-ouvrage"
                ? "do"
                : recommendedProduct === "rc-fabriquant"
                  ? "rc_fabriquant"
                  : "decennale",
            companyName:
              typeof mergedData.raisonSociale === "string" ? mergedData.raisonSociale : undefined,
            projectName:
              typeof mergedData.projectName === "string"
                ? mergedData.projectName
                : typeof mergedData.doProjectName === "string"
                  ? mergedData.doProjectName
                  : undefined,
            projectAddress:
              typeof mergedData.projectAddress === "string"
                ? mergedData.projectAddress
                : typeof mergedData.doProjectAddress === "string"
                  ? mergedData.doProjectAddress
                  : undefined,
            activitiesCount,
            turnover: Number.isFinite(turnover as number) ? (turnover as number) : undefined,
          }),
          suitabilityScore: 0.9,
          context: {
            reason: "gestion_document_avenant_update",
            numero: document.numero,
            modifiedKeys: Object.keys(filteredModifications),
            adequacyConfirmed: true,
          },
        },
      })
    }

    return NextResponse.json({ ok: true, data: stripSignatureBinaries(mergedData) })
  } catch (error) {
    console.error("Erreur modification document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification" },
      { status: 500 }
    )
  }
}

/** Suppression d'un contrat signé créé par erreur. Devis, attestations et factures restent. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const document = await prisma.document.findFirst({
      where: { id },
      select: { id: true, type: true, numero: true, status: true, userId: true },
    })
    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }
    if (!isErroneousContractDocumentType(document.type)) {
      return NextResponse.json(
        { error: "Seul un contrat peut être supprimé ici. Les devis, attestations et factures restent." },
        { status: 409 }
      )
    }

    await prisma.document.delete({ where: { id } })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: ERRONEOUS_CONTRACT_DELETE_ACTION,
      targetType: "document",
      targetId: id,
      details: {
        numero: document.numero,
        documentType: document.type,
        status: document.status,
        userId: document.userId,
        reason: "erreur",
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }
    console.error("Erreur suppression contrat:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
  }
}
