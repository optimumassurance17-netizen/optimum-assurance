import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

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
