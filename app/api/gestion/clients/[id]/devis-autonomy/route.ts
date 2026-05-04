import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { logAdminActivity } from "@/lib/admin-activity"
import {
  CLIENT_DEVIS_AUTONOMY_ACTION,
  getClientDevisAutonomyConfig,
  normalizeForcedActivitiesInput,
} from "@/lib/client-devis-autonomy"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const config = await getClientDevisAutonomyConfig(id)
    return NextResponse.json({ config })
  } catch (error) {
    console.error("[gestion/clients/:id/devis-autonomy GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

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
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }

    const payload = body as {
      allowDevisEdition?: unknown
      allowForcedActivities?: unknown
      forcedActivities?: unknown
      note?: unknown
    }

    const normalizedForcedActivities = normalizeForcedActivitiesInput(
      payload.forcedActivities
    )
    const allowDevisEdition = payload.allowDevisEdition === true
    const allowForcedActivities = payload.allowForcedActivities === true
    const note =
      typeof payload.note === "string" && payload.note.trim().length > 0
        ? payload.note.trim().slice(0, 400)
        : null

    const details = {
      allowDevisEdition,
      allowForcedActivities,
      forcedActivities: allowForcedActivities ? normalizedForcedActivities : [],
      note,
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: CLIENT_DEVIS_AUTONOMY_ACTION,
      targetType: "user",
      targetId: id,
      details,
    })

    const config = await getClientDevisAutonomyConfig(id)
    return NextResponse.json({ ok: true, config })
  } catch (error) {
    console.error("[gestion/clients/:id/devis-autonomy PATCH]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
