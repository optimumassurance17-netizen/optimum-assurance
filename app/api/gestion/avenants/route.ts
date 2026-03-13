import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, contractNumero, modifications, motif } = body

    if (!userId || !contractNumero || !modifications || typeof modifications !== "object") {
      return NextResponse.json(
        { error: "userId, contractNumero et modifications requis" },
        { status: 400 }
      )
    }

    const contract = await prisma.document.findFirst({
      where: { userId, type: "contrat", numero: contractNumero },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 })
    }

    const contractData = JSON.parse(contract.data) as Record<string, unknown>
    const mergedData = {
      ...contractData,
      ...modifications,
      contractNumero,
      motifAvenant: motif || "Modification contractuelle",
      dateAvenant: new Date().toLocaleDateString("fr-FR"),
      fraisAvenant: 60,
      fraisAvenantReport: "Les frais de 60 € seront automatiquement reportés sur la prochaine échéance de prélèvement.",
    }

    const numero = await getNextNumero("avenant")

    const document = await prisma.document.create({
      data: {
        userId,
        type: "avenant",
        numero,
        data: JSON.stringify(mergedData),
      },
    })

    await prisma.avenantFee.create({
      data: {
        userId,
        documentId: document.id,
        amount: 60,
        status: "pending",
      },
    })

    return NextResponse.json({
      id: document.id,
      numero: document.numero,
    })
  } catch (error) {
    console.error("Erreur création avenant:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
