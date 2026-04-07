import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { logContractAction } from "@/lib/insurance-contract-service"

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
    const body = (await request.json()) as { premium?: unknown }
    const premium = typeof body.premium === "number" ? body.premium : parseFloat(String(body.premium ?? ""))
    if (!Number.isFinite(premium) || premium <= 0) {
      return NextResponse.json({ error: "premium invalide (> 0 requis)" }, { status: 400 })
    }

    const existing = await prisma.insuranceContract.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
    }

    if (existing.status !== CONTRACT_STATUS.approved && existing.status !== CONTRACT_STATUS.active) {
      return NextResponse.json(
        { error: "Prime modifiable seulement pour contrat approuvé ou actif" },
        { status: 400 }
      )
    }

    const previous = existing.premium
    await prisma.insuranceContract.update({
      where: { id },
      data: { premium },
    })

    await logContractAction(
      id,
      "premium_updated_gestion",
      { previous, next: premium },
      session.user.email
    )

    return NextResponse.json({ ok: true, premium })
  } catch (e) {
    console.error("[gestion/insurance-contracts PATCH]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
