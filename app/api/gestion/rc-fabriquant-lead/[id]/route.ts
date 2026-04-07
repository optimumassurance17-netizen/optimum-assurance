import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import {
  isRcFabriquantLeadStatut,
  normalizeRcFabriquantLeadStatut,
} from "@/lib/rc-fabriquant-lead-statuts"
import { asJsonObject } from "@/lib/json-object"

const NOTES_MAX = 8000

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
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
    }

    const o = asJsonObject(body)
    if (Object.keys(o).length === 0) {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }
    const statutRaw = typeof o.statut === "string" ? o.statut.trim() : undefined
    const notesRaw = o.notesInternes

    if (statutRaw === undefined && notesRaw === undefined) {
      return NextResponse.json({ error: "Rien à mettre à jour (statut ou notesInternes)" }, { status: 400 })
    }

    let statut: string | undefined
    if (statutRaw !== undefined) {
      if (!isRcFabriquantLeadStatut(statutRaw)) {
        return NextResponse.json({ error: "Statut inconnu" }, { status: 400 })
      }
      statut = statutRaw
    }

    let notesInternes: string | null | undefined
    if (notesRaw !== undefined) {
      if (notesRaw === null) {
        notesInternes = null
      } else if (typeof notesRaw === "string") {
        const t = notesRaw.trim()
        notesInternes = t.length === 0 ? null : t.slice(0, NOTES_MAX)
      } else {
        return NextResponse.json({ error: "notesInternes invalide" }, { status: 400 })
      }
    }

    const existing = await prisma.devisRcFabriquantLead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }

    const updated = await prisma.devisRcFabriquantLead.update({
      where: { id },
      data: {
        ...(statut !== undefined ? { statut } : {}),
        ...(notesInternes !== undefined ? { notesInternes } : {}),
      },
    })

    return NextResponse.json({
      ok: true,
      lead: {
        id: updated.id,
        statut: normalizeRcFabriquantLeadStatut(updated.statut),
        notesInternes: updated.notesInternes,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (e) {
    console.error("[gestion/rc-fabriquant-lead]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
