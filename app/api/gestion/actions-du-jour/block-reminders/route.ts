import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import {
  blockAutoReminder,
  parseDashboardActionAutoReminderTarget,
} from "@/lib/auto-reminder-blocking"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
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

    const actionId =
      typeof (body as { actionId?: unknown }).actionId === "string"
        ? (body as { actionId?: string }).actionId?.trim() ?? ""
        : ""

    if (!actionId || actionId.length > 180) {
      return NextResponse.json({ error: "actionId invalide" }, { status: 400 })
    }

    const target = parseDashboardActionAutoReminderTarget(actionId)
    if (!target) {
      return NextResponse.json(
        { error: "Cette action ne prend pas en charge le blocage des relances automatiques." },
        { status: 400 }
      )
    }

    const result = await blockAutoReminder({
      adminEmail: session.user.email || "admin",
      targetType: target.targetType,
      targetId: target.targetId,
      details: {
        source: "gestion_actions_du_jour",
        actionId,
      },
    })

    return NextResponse.json({
      ok: true,
      blocked: result === "created",
      alreadyBlocked: result === "already",
    })
  } catch (error) {
    console.error("[gestion/actions-du-jour/block-reminders]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
