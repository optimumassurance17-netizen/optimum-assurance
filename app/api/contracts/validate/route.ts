import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { approveInsuranceContract, rejectInsuranceContract } from "@/lib/insurance-contract-service"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
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
    const contractId = typeof raw.contractId === "string" ? raw.contractId.trim() : ""
    const approve = raw.approve
    const reasonRaw = typeof raw.reason === "string" ? raw.reason.trim() : ""
    if (!contractId || typeof approve !== "boolean") {
      return NextResponse.json({ error: "contractId et approve requis" }, { status: 400 })
    }

    if (approve) {
      const c = await approveInsuranceContract(contractId, session.user.email)
      return NextResponse.json({ contract: { id: c.id, status: c.status } })
    }
    const reason = reasonRaw || "Refus administratif"
    const c = await rejectInsuranceContract(contractId, reason, session.user.email)
    return NextResponse.json({ contract: { id: c.id, status: c.status } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur"
    const status = msg === "NOT_FOUND" ? 404 : msg === "INVALID_STATE" ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
