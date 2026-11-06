import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { asJsonObject } from "@/lib/json-object"
import { authorizeDecennaleReprisePasse } from "@/lib/decennale-reprise-passe-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }
    const { id } = await params
    const body = asJsonObject<{ dateReprise?: string }>(await request.json().catch(() => null))
    const result = await authorizeDecennaleReprisePasse({
      userId: id,
      dateReprise: typeof body.dateReprise === "string" ? body.dateReprise : "",
      adminEmail: session.user.email || "admin",
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("[gestion/clients/:id/reprise-passe] POST", error)
    return NextResponse.json(
      { error: "Erreur lors de l'autorisation de la reprise du passé." },
      { status: 500 }
    )
  }
}
