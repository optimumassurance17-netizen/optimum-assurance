import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { logAdminActivity } from "@/lib/admin-activity"
import { prisma } from "@/lib/prisma"

const PAYMENT_STATUSES = new Set(["paid", "pending", "failed"])

function asOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed
}

/**
 * Rectification manuelle d'un paiement (admin).
 * Champs supportés: amount, status, paidAt
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { id: true, userId: true, amount: true, status: true, paidAt: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 })
    }

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
      amount?: unknown
      status?: unknown
      paidAt?: unknown
    }

    const updates: {
      amount?: number
      status?: string
      paidAt?: Date | null
    } = {}
    const changed: Record<string, unknown> = {}

    if ("amount" in payload) {
      const amount =
        typeof payload.amount === "number"
          ? payload.amount
          : Number(String(payload.amount ?? "").replace(",", "."))
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Montant invalide (> 0 requis)" }, { status: 400 })
      }
      updates.amount = Math.round(amount * 100) / 100
      changed.amount = { from: existing.amount, to: updates.amount }
    }

    if ("status" in payload) {
      const status = String(payload.status ?? "").trim().toLowerCase()
      if (!PAYMENT_STATUSES.has(status)) {
        return NextResponse.json({ error: "Statut paiement invalide" }, { status: 400 })
      }
      updates.status = status
      changed.status = { from: existing.status, to: status }
    }

    if ("paidAt" in payload) {
      const paidAt = asOptionalDate(payload.paidAt)
      if (paidAt === undefined) {
        return NextResponse.json({ error: "paidAt invalide" }, { status: 400 })
      }
      updates.paidAt = paidAt
      changed.paidAt = { from: existing.paidAt, to: paidAt }
    }

    if (updates.status === "paid" && !("paidAt" in payload)) {
      updates.paidAt = existing.paidAt ?? new Date()
      changed.paidAt = { from: existing.paidAt, to: updates.paidAt }
    }
    if (updates.status && updates.status !== "paid" && !("paidAt" in payload)) {
      updates.paidAt = null
      changed.paidAt = { from: existing.paidAt, to: null }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune rectification fournie" }, { status: 400 })
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        amount: true,
        status: true,
        paidAt: true,
        createdAt: true,
        userId: true,
      },
    })

    await logAdminActivity({
      adminEmail: session.user.email,
      action: "payment_rectified",
      targetType: "payment",
      targetId: id,
      details: changed,
    })

    return NextResponse.json({ ok: true, payment: updated })
  } catch (error) {
    console.error("[gestion/payments PATCH]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
