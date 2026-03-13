import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Enregistre une demande de devis dommage ouvrage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, data, coutTotal } = body

    if (!email || !data) {
      return NextResponse.json(
        { error: "Email et données du questionnaire requis" },
        { status: 400 }
      )
    }

    await prisma.devisDommageOuvrageLead.create({
      data: {
        email,
        data: JSON.stringify(data),
        coutTotal: coutTotal ? Number(coutTotal) : null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur enregistrement devis DO:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement" },
      { status: 500 }
    )
  }
}
