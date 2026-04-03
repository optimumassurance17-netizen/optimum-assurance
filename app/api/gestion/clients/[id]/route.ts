import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { syncContratAvenantDocumentsFromUser } from "@/lib/sync-user-document-identity"

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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        raisonSociale: true,
        siret: true,
        adresse: true,
        codePostal: true,
        ville: true,
        telephone: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const [documents, payments, avenantFees, notes, sinistres, userDocuments] = await Promise.all([
      prisma.document.findMany({
        where: { userId: id },
        select: { id: true, type: true, numero: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { userId: id },
        select: { id: true, amount: true, status: true, paidAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.avenantFee.findMany({
        where: { userId: id },
        select: { id: true, amount: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientNote.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sinistre.findMany({
        where: { userId: id },
        include: { userDocument: { select: { id: true, filename: true, type: true } } },
        orderBy: { dateSinistre: "desc" },
      }),
      prisma.userDocument.findMany({
        where: { userId: id },
        select: { id: true, type: true, filename: true, size: true, createdAt: true },
        orderBy: { type: "asc" },
      }),
    ])

    return NextResponse.json({
      user,
      documents,
      payments,
      avenantFees,
      notes,
      sinistres,
      userDocuments,
    })
  } catch (error) {
    console.error("Erreur détail client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * PATCH — Mise à jour des coordonnées compte client (admin uniquement)
 * Body partiel : { raisonSociale?, email?, siret?, adresse?, codePostal?, ville?, telephone? }
 */
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
    const body = (await request.json()) as Record<string, unknown>

    const current = await prisma.user.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const data: {
      raisonSociale?: string | null
      siret?: string | null
      adresse?: string | null
      codePostal?: string | null
      ville?: string | null
      telephone?: string | null
      email?: string
    } = {}

    const opt = (v: unknown): string | null => {
      const s = String(v ?? "").trim()
      return s === "" ? null : s
    }

    if ("raisonSociale" in body) data.raisonSociale = opt(body.raisonSociale)
    if ("siret" in body) data.siret = opt(body.siret)
    if ("adresse" in body) data.adresse = opt(body.adresse)
    if ("codePostal" in body) data.codePostal = opt(body.codePostal)
    if ("ville" in body) data.ville = opt(body.ville)
    if ("telephone" in body) data.telephone = opt(body.telephone)

    if ("email" in body) {
      const raw = String(body.email ?? "").trim().toLowerCase()
      if (!raw) {
        return NextResponse.json({ error: "L'email ne peut pas être vide" }, { status: 400 })
      }
      if (!EMAIL_RE.test(raw)) {
        return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 })
      }
      if (raw !== current.email) {
        const taken = await prisma.user.findUnique({ where: { email: raw }, select: { id: true } })
        if (taken) {
          return NextResponse.json({ error: "Cet email est déjà utilisé par un autre compte" }, { status: 409 })
        }
      }
      data.email = raw
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        raisonSociale: true,
        siret: true,
        adresse: true,
        codePostal: true,
        ville: true,
        telephone: true,
        createdAt: true,
      },
    })

    const syncedDocuments = await syncContratAvenantDocumentsFromUser(id)

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "user_update",
      targetType: "user",
      targetId: id,
      details: { keys: Object.keys(data), syncedDocuments },
    })

    return NextResponse.json({ user: updated, syncedDocuments })
  } catch (error) {
    console.error("Erreur PATCH client:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
  }
}
