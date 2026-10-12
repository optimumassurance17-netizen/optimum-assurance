import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"

function readRaisonSociale(data: string): string | null {
  try {
    const parsed = JSON.parse(data || "{}") as { raisonSociale?: unknown }
    if (typeof parsed.raisonSociale !== "string") return null
    const normalized = parsed.raisonSociale.trim()
    return normalized.length > 0 ? normalized : null
  } catch {
    return null
  }
}

/**
 * DELETE - Supprime un brouillon de devis appartenant à l'email du client connecté.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const draftId = id?.trim()
    if (!draftId) {
      return NextResponse.json({ error: "Identifiant requis" }, { status: 400 })
    }

    const sessionEmail = session.user.email?.trim().toLowerCase()
    const email =
      sessionEmail ||
      (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { email: true },
        })
      )?.email
        ?.trim()
        .toLowerCase() ||
      ""

    if (!email) {
      return NextResponse.json({ error: "Devis enregistré introuvable" }, { status: 404 })
    }

    const draft = await prisma.devisDraft.findFirst({
      where: {
        id: draftId,
        email: { equals: email, mode: "insensitive" },
      },
      select: { id: true, produit: true, data: true },
    })
    if (!draft) {
      return NextResponse.json({ error: "Devis enregistré introuvable" }, { status: 404 })
    }

    await prisma.devisDraft.delete({ where: { id: draft.id } })

    await logAdminActivity({
      adminEmail: email,
      action: "client_quote_draft_deleted",
      targetType: "user",
      targetId: session.user.id,
      details: {
        draftId: draft.id,
        produit: draft.produit,
        raisonSociale: readRaisonSociale(draft.data),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur suppression brouillon devis client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
