import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { attestationId } = body

    if (!attestationId) {
      return NextResponse.json({ error: "attestationId requis" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: {
        id: attestationId,
        userId: session.user.id,
        type: "attestation",
        status: "suspendu",
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Attestation introuvable" }, { status: 404 })
    }

    await prisma.document.update({
      where: { id: attestationId },
      data: { status: "valide" },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur restauration attestation:", error)
    return NextResponse.json(
      { error: "Erreur lors de la restauration" },
      { status: 500 }
    )
  }
}
