import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params

    const notes = await prisma.clientNote.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error("Erreur notes client:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}

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
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const content = (body as Record<string, unknown>).content

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content requis" }, { status: 400 })
    }

    const note = await prisma.clientNote.create({
      data: {
        userId: id,
        content: content.trim(),
        adminEmail: session.user.email || "admin",
      },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "note_created",
      targetType: "user",
      targetId: id,
      details: { noteId: note.id },
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error("Erreur création note:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
