import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { approveInsuranceContract, rejectInsuranceContract } from "@/lib/insurance-contract-service"
import { asJsonObject } from "@/lib/json-object"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = asJsonObject<{
      contractId?: string
      approve?: boolean
      reason?: string
    }>(await request.json())
    if (!body.contractId || typeof body.approve !== "boolean") {
      return NextResponse.json({ error: "contractId et approve requis" }, { status: 400 })
    }

    if (body.approve) {
      const c = await approveInsuranceContract(body.contractId, session.user.email)
      return NextResponse.json({ contract: { id: c.id, status: c.status } })
    }
    const reason = body.reason?.trim() || "Refus administratif"
    const c = await rejectInsuranceContract(body.contractId, reason, session.user.email)
    return NextResponse.json({ contract: { id: c.id, status: c.status } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur"
    const status = msg === "NOT_FOUND" ? 404 : msg === "INVALID_STATE" ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
