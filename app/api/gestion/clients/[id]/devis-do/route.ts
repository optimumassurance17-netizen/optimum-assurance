import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import {
  applyPendingDoQuoteCorrection,
  parsePendingDoConstructionCost,
  pendingDoQuoteStorageKey,
} from "@/lib/do-quote-pending"

async function withSchemaDriftFallback<T>(fn: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return fallbackValue
    }
    throw error
  }
}

function readRecord(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * PATCH - Corrige l'adresse et le coût d'un devis DO encore à préparer.
 * Body: { chantier: string, constructionCost: number | string }
 * N'ouvre pas de numéro de contrat et ne crée pas de paiement.
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
    const payload = body as { chantier?: unknown; constructionCost?: unknown } | null
    const chantier = typeof payload?.chantier === "string" ? payload.chantier.trim() : ""
    const constructionCost = parsePendingDoConstructionCost(payload?.constructionCost)
    if (!chantier || chantier.length > 300) {
      return NextResponse.json({ error: "L'adresse du chantier est requise." }, { status: 400 })
    }
    if (constructionCost == null) {
      return NextResponse.json({ error: "Le coût de construction est requis." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        doInitialQuestionnaireJson: true,
        doEtudeQuestionnaireJson: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const contracts = await withSchemaDriftFallback(
      () =>
        prisma.insuranceContract.findMany({
          where: { userId: id },
          select: { productType: true },
        }),
      []
    )
    const sourceKey = pendingDoQuoteStorageKey({
      hasDoContract: contracts.some((contract) => contract.productType === "do"),
      initialJson: user.doInitialQuestionnaireJson,
      etudeJson: user.doEtudeQuestionnaireJson,
    })
    const sourceRaw =
      sourceKey === "doEtudeQuestionnaireJson"
        ? user.doEtudeQuestionnaireJson
        : sourceKey === "doInitialQuestionnaireJson"
          ? user.doInitialQuestionnaireJson
          : null
    const sourceRecord = readRecord(sourceRaw)
    if (!sourceKey || !sourceRecord) {
      return NextResponse.json({ error: "Aucun devis DO à préparer." }, { status: 404 })
    }

    const questionnaireJson = JSON.stringify(
      applyPendingDoQuoteCorrection(sourceRecord, { chantier, constructionCost })
    )
    await prisma.user.update({
      where: { id: user.id },
      data: { [sourceKey]: questionnaireJson },
    })

    const lead = await withSchemaDriftFallback(
      () =>
        prisma.devisDommageOuvrageLead.findFirst({
          where: { email: { equals: user.email.trim(), mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
          select: { id: true, data: true },
        }),
      null
    )
    if (lead) {
      const leadRecord = readRecord(lead.data)
      await prisma.devisDommageOuvrageLead.update({
        where: { id: lead.id },
        data: {
          coutTotal: constructionCost,
          ...(leadRecord
            ? {
                data: JSON.stringify(
                  applyPendingDoQuoteCorrection(leadRecord, { chantier, constructionCost })
                ),
              }
            : {}),
        },
      })
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "devis_do_pending_updated",
      targetType: "user",
      targetId: user.id,
      details: {
        chantier,
        constructionCost,
        sourceKey,
        leadId: lead?.id ?? null,
      },
    })

    return NextResponse.json({
      sourceKey,
      questionnaireJson,
      leadId: lead?.id ?? null,
      chantier,
      constructionCost,
    })
  } catch (error) {
    console.error("Erreur correction devis DO:", error)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
  }
}
