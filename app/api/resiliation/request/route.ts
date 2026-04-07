import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function parseDate(str: string): Date | null {
  if (!str || typeof str !== "string") return null
  const parts = str.trim().split(/[/\-.]/)
  if (parts.length !== 3) return null
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const year = parseInt(parts[2], 10)
  const d = new Date(year, month, day)
  if (isNaN(d.getTime())) return null
  return d
}

function isInResiliationWindow(dateEffet: Date | null, dateEcheance: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limiteEcheance = new Date(dateEcheance)
  limiteEcheance.setHours(0, 0, 0, 0)
  limiteEcheance.setMonth(limiteEcheance.getMonth() - 2)
  if (today > limiteEcheance) return false
  if (!dateEffet) return false
  const unAnApresEffet = new Date(dateEffet)
  unAnApresEffet.setHours(0, 0, 0, 0)
  unAnApresEffet.setFullYear(unAnApresEffet.getFullYear() + 1)
  return today >= unAnApresEffet
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
    const rawDocumentId = payload.documentId
    const rawMotif = payload.motif
    const documentId = typeof rawDocumentId === "string" ? rawDocumentId.trim() : ""
    const motif = typeof rawMotif === "string" ? rawMotif.trim() : ""

    if (!documentId) {
      return NextResponse.json({ error: "documentId requis" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
        type: { in: ["contrat", "attestation"] },
        status: { in: ["valide", "suspendu"] },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document introuvable ou non résiliable" }, { status: 404 })
    }

    const data = JSON.parse(document.data || "{}") as { dateEffet?: string; dateEcheance?: string }
    const dateEcheance = parseDate(data.dateEcheance || "")
    const dateEffet = data.dateEffet ? parseDate(data.dateEffet) : null
    if (!dateEcheance || !isInResiliationWindow(dateEffet, dateEcheance)) {
      return NextResponse.json(
        { error: "La demande de résiliation nécessite au moins 1 an de contrat et doit être effectuée au plus tard 2 mois avant l'échéance." },
        { status: 400 }
      )
    }

    const existing = await prisma.resiliationRequest.findFirst({
      where: { documentId, status: "pending" },
    })

    if (existing) {
      return NextResponse.json({ error: "Une demande est déjà en cours" }, { status: 400 })
    }

    await prisma.resiliationRequest.create({
      data: {
        documentId,
        userId: session.user.id,
        motif: motif || null,
        status: "pending",
      },
    })

    return NextResponse.json({ ok: true, message: "Demande envoyée" })
  } catch (error) {
    console.error("Erreur demande résiliation:", error)
    return NextResponse.json(
      { error: "Erreur lors de la demande" },
      { status: 500 }
    )
  }
}
