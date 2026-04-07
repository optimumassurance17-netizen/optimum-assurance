import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const MOLLIE_PAYMENT_ID_RE = /^tr_[A-Za-z0-9]+$/
const ALLOWED_PAYMENT_STATUS = new Set(["paid", "pending", "failed"] as const)
type AllowedPaymentStatus = "paid" | "pending" | "failed"

function parseAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null
  }
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim()
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

function parsePaymentStatus(value: unknown): AllowedPaymentStatus {
  if (typeof value === "string" && ALLOWED_PAYMENT_STATUS.has(value as AllowedPaymentStatus)) {
    return value as AllowedPaymentStatus
  }
  return "paid"
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
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

    const raw = body as Record<string, unknown>
    const molliePaymentId = typeof raw.molliePaymentId === "string" ? raw.molliePaymentId.trim() : ""
    const amount = parseAmount(raw.amount)
    const paymentStatus = parsePaymentStatus(raw.status)
    const metadata = raw.metadata

    if (!molliePaymentId || !MOLLIE_PAYMENT_ID_RE.test(molliePaymentId)) {
      return NextResponse.json({ error: "molliePaymentId invalide" }, { status: 400 })
    }

    if (amount == null) {
      return NextResponse.json({ error: "amount invalide (nombre > 0 attendu)" }, { status: 400 })
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { molliePaymentId },
      select: { userId: true },
    })
    if (existingPayment && existingPayment.userId !== session.user.id) {
      return NextResponse.json({ error: "Accès refusé à ce paiement" }, { status: 403 })
    }

    await prisma.payment.upsert({
      where: { molliePaymentId },
      create: {
        userId: session.user.id,
        molliePaymentId,
        amount,
        status: paymentStatus,
        paidAt: paymentStatus === "paid" ? new Date() : null,
        metadata: metadata === undefined ? null : JSON.stringify(metadata),
      },
      update: {
        amount,
        status: paymentStatus,
        paidAt: paymentStatus === "paid" ? new Date() : null,
        metadata: metadata === undefined ? undefined : JSON.stringify(metadata),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur enregistrement paiement:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement" },
      { status: 500 }
    )
  }
}
