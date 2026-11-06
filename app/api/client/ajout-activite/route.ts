import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { asJsonObject } from "@/lib/json-object"
import { ajouterActiviteClient, lireAjoutActiviteClient } from "@/lib/decennale-ajout-activite-service"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    const result = await lireAjoutActiviteClient(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[client/ajout-activite][GET]", error)
    return NextResponse.json({ error: "Erreur lors du chargement des activités." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    const body = asJsonObject<{ activite?: unknown }>(await request.json().catch(() => null))
    const activite = typeof body.activite === "string" ? body.activite : ""
    const result = await ajouterActiviteClient({
      userId: session.user.id,
      email: session.user.email || "client",
      activite,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("[client/ajout-activite][POST]", error)
    return NextResponse.json({ error: "Erreur lors de l'ajout de l'activité." }, { status: 500 })
  }
}
