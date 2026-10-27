import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { logAdminActivity } from "@/lib/admin-activity"
import { ERRONEOUS_CONTRACT_DELETE_ACTION } from "@/lib/erroneous-contract-delete"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/prisma-client"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { logContractAction } from "@/lib/insurance-contract-service"
import {
  payloadTouchesPlatformContractIdentity,
  readPlatformContractIdentityPatch,
} from "@/lib/platform-contract-edit"

/**
 * Ajustement manuel de la prime contrat.
 * - **RC Fab** : prime = prochain montant Mollie (échéance).
 * - **Décennale** : prime = prime **annuelle** TTC (le virement Mollie client = 1/4 — voir `/api/contracts/pay`).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
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
    const payload = body as {
      premium?: unknown
      status?: unknown
      rejectedReason?: unknown
      paidAt?: unknown
      clientName?: unknown
      siret?: unknown
      address?: unknown
      activities?: unknown
      projectName?: unknown
      projectAddress?: unknown
      constructionNature?: unknown
    }

    const existing = await prisma.insuranceContract.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
    }

    const updates: {
      premium?: number
      status?: string
      rejectedReason?: string | null
      paidAt?: Date | null
      clientName?: string
      siret?: string | null
      address?: string
      activitiesJson?: string | null
      projectName?: string | null
      projectAddress?: string | null
      constructionNature?: string | null
    } = {}
    const changed: Record<string, unknown> = {}

    if (payloadTouchesPlatformContractIdentity(payload)) {
      const identity = readPlatformContractIdentityPatch(existing.productType, payload)
      if (!identity.ok) {
        return NextResponse.json({ error: identity.error }, { status: identity.status })
      }
      updates.clientName = identity.patch.clientName
      updates.siret = identity.patch.siret
      updates.address = identity.patch.address
      updates.activitiesJson = identity.patch.activitiesJson
      changed.clientName = { from: existing.clientName, to: identity.patch.clientName }
      changed.address = { from: existing.address, to: identity.patch.address }
      changed.activitiesJson = { from: existing.activitiesJson, to: identity.patch.activitiesJson }
      if (existing.productType === "do") {
        updates.projectName = identity.patch.projectName
        updates.projectAddress = identity.patch.projectAddress
        updates.constructionNature = identity.patch.constructionNature
        changed.projectName = { from: existing.projectName, to: identity.patch.projectName }
        changed.projectAddress = { from: existing.projectAddress, to: identity.patch.projectAddress }
        changed.constructionNature = { from: existing.constructionNature, to: identity.patch.constructionNature }
      }
    }

    if ("premium" in payload) {
      const premium =
        typeof payload.premium === "number"
          ? payload.premium
          : parseFloat(String(payload.premium ?? ""))
      if (!Number.isFinite(premium) || premium <= 0) {
        return NextResponse.json({ error: "premium invalide (> 0 requis)" }, { status: 400 })
      }
      updates.premium = premium
      changed.premium = { from: existing.premium, to: premium }
    }

    if ("status" in payload) {
      const statusRaw = String(payload.status ?? "").trim()
      if (!Object.values(CONTRACT_STATUS).includes(statusRaw as (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS])) {
        return NextResponse.json({ error: "status invalide" }, { status: 400 })
      }
      updates.status = statusRaw
      changed.status = { from: existing.status, to: statusRaw }
    }

    if ("rejectedReason" in payload) {
      const raw = typeof payload.rejectedReason === "string" ? payload.rejectedReason.trim() : ""
      updates.rejectedReason = raw || null
      changed.rejectedReason = { from: existing.rejectedReason, to: updates.rejectedReason }
    }

    if ("paidAt" in payload) {
      if (payload.paidAt == null || payload.paidAt === "") {
        updates.paidAt = null
      } else {
        const paidAt = new Date(String(payload.paidAt))
        if (Number.isNaN(paidAt.getTime())) {
          return NextResponse.json({ error: "paidAt invalide" }, { status: 400 })
        }
        updates.paidAt = paidAt
      }
      changed.paidAt = { from: existing.paidAt, to: updates.paidAt }
    }

    if (updates.status === CONTRACT_STATUS.paid && !("paidAt" in payload)) {
      updates.paidAt = existing.paidAt ?? new Date()
      changed.paidAt = { from: existing.paidAt, to: updates.paidAt }
    }

    if (updates.status && updates.status !== CONTRACT_STATUS.rejected && !("rejectedReason" in payload)) {
      updates.rejectedReason = null
      changed.rejectedReason = { from: existing.rejectedReason, to: null }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucun champ à rectifier" }, { status: 400 })
    }

    const updated = await prisma.insuranceContract.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        contractNumber: true,
        status: true,
        premium: true,
        paidAt: true,
        rejectedReason: true,
      },
    })

    await logContractAction(
      id,
      "gestion_contract_rectified",
      changed,
      session.user.email
    )

    if (payloadTouchesPlatformContractIdentity(payload)) {
      await logAdminActivity({
        adminEmail: session.user.email,
        action: "gestion_contract_updated",
        targetType: "insurance_contract",
        targetId: id,
        details: {
          contractNumber: existing.contractNumber,
          productType: existing.productType,
          changed: Object.keys(changed),
        },
      })
    }

    return NextResponse.json({ ok: true, contract: updated })
  } catch (e) {
    console.error("[gestion/insurance-contracts PATCH]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

/** Suppression d'un contrat plateforme créé par erreur. Les encaissements Mollie restent. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const { id } = await params
    const existing = await prisma.insuranceContract.findUnique({
      where: { id },
      select: {
        id: true,
        contractNumber: true,
        productType: true,
        status: true,
        paidAt: true,
        userId: true,
        clientName: true,
        premium: true,
      },
    })
    if (!existing) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 })
    }

    await prisma.insuranceContract.delete({ where: { id } })

    await logAdminActivity({
      adminEmail: session.user.email,
      action: ERRONEOUS_CONTRACT_DELETE_ACTION,
      targetType: "insurance_contract",
      targetId: id,
      details: {
        contractNumber: existing.contractNumber,
        productType: existing.productType,
        status: existing.status,
        paidAt: existing.paidAt?.toISOString() ?? null,
        userId: existing.userId,
        clientName: existing.clientName,
        premium: existing.premium,
        reason: "erreur",
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 })
    }
    console.error("[gestion/insurance-contracts DELETE]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
