import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { asJsonObject } from "@/lib/json-object"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = asJsonObject<{
      molliePaymentId?: string
      amount?: number | string
      status?: string
      metadata?: unknown
    }>(await request.json())
    const { molliePaymentId, amount, status: paymentStatus } = body

    if (!molliePaymentId || amount == null) {
      return NextResponse.json(
        { error: "molliePaymentId et amount requis" },
        { status: 400 }
      )
    }

    await prisma.payment.upsert({
      where: { molliePaymentId },
      create: {
        userId: session.user.id,
        molliePaymentId,
        amount: Number(amount),
        status: paymentStatus || "paid",
        paidAt: paymentStatus === "paid" ? new Date() : null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      },
      update: {
        status: paymentStatus || "paid",
        paidAt: paymentStatus === "paid" ? new Date() : undefined,
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
