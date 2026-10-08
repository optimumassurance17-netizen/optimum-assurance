import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin, isAdminEmail } from "@/lib/admin"
import { logAdminActivity } from "@/lib/admin-activity"
import { clientDeleteErrorMessage, mergeClientAccounts } from "@/lib/client-account"
import { buildDuplicateGroups, selectionBelongsToOneGroup } from "@/lib/duplicate-accounts"
import { prisma } from "@/lib/prisma"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session)) return null
  return session
}

export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

    const users = await prisma.user.findMany({
      select: { id: true, email: true, raisonSociale: true, siret: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })
    const groups = buildDuplicateGroups(users).map((group) => ({
      ...group,
      members: group.members.map((member) => ({
        ...member,
        createdAt: member.createdAt instanceof Date ? member.createdAt.toISOString() : member.createdAt,
      })),
    }))
    return NextResponse.json({ groups })
  } catch (error) {
    console.error("[gestion/clients/duplicates] GET", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

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
    const keepId = typeof raw.keepId === "string" ? raw.keepId.trim() : ""
    const mergeIds = Array.isArray(raw.mergeIds)
      ? raw.mergeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim())
      : []
    if (!keepId || mergeIds.length === 0 || mergeIds.length > 20) {
      return NextResponse.json({ error: "Indiquez la fiche à conserver et les fiches à fusionner." }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, raisonSociale: true, siret: true, createdAt: true },
    })
    const groups = buildDuplicateGroups(users)
    if (!selectionBelongsToOneGroup(groups, keepId, mergeIds)) {
      return NextResponse.json({ error: "Ces fiches ne forment pas un doublon." }, { status: 400 })
    }

    const dropping = users.filter((user) => mergeIds.includes(user.id))
    if (dropping.length !== mergeIds.length) {
      return NextResponse.json({ error: "Une fiche à fusionner est introuvable." }, { status: 404 })
    }
    if (
      dropping.some((user) => user.id === session.user.id || isAdminEmail(user.email))
    ) {
      return NextResponse.json(
        { error: "Un compte administrateur ne peut pas être supprimé par la fusion." },
        { status: 400 }
      )
    }

    const mergedIds = await mergeClientAccounts(keepId, mergeIds)
    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "clients_fusionnes",
      targetType: "user",
      targetId: keepId,
      details: {
        keepId,
        mergedIds,
        mergedEmails: dropping.map((user) => user.email),
      },
    })
    return NextResponse.json({ ok: true, keepId, mergedIds })
  } catch (error) {
    console.error("[gestion/clients/duplicates] POST", error)
    const message =
      error instanceof Error && error.message.startsWith("Fusion incomplète")
        ? error.message
        : clientDeleteErrorMessage(error)
    const status = message === "Client introuvable" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
