import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

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

    const actionId = typeof (body as { actionId?: unknown }).actionId === "string"
      ? (body as { actionId?: string }).actionId?.trim() ?? ""
      : ""

    if (!actionId || actionId.length > 160) {
      return NextResponse.json({ error: "actionId invalide" }, { status: 400 })
    }

    const now = new Date()
    const todayStart = startOfUtcDay(now)
    const dayKey = now.toISOString().slice(0, 10)

    const already = await prisma.adminActivityLog.findFirst({
      where: {
        action: "dashboard_action_dismissed",
        targetType: "dashboard_action",
        targetId: actionId,
        createdAt: { gte: todayStart },
      },
      select: { id: true },
    })
    if (already) {
      return NextResponse.json({ ok: true, alreadyDismissed: true })
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "dashboard_action_dismissed",
      targetType: "dashboard_action",
      targetId: actionId,
      details: { dayKey },
    })

    return NextResponse.json({ ok: true, dismissed: true })
  } catch (error) {
    console.error("[gestion/actions-du-jour/dismiss]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
