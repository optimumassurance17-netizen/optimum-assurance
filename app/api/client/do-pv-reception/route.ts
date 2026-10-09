import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  generatePvReceptionVierge,
  PV_RECEPTION_VIERGE_FILENAME,
} from "@/lib/pdf/do/generatePvReceptionVierge"

/**
 * Téléchargement du procès-verbal de réception vierge.
 * Réservé à un client qui a déjà un dossier dommage ouvrage. Le PDF ne reprend aucune donnée du dossier.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const dossier = await prisma.insuranceContract.findFirst({
      where: { userId: session.user.id, productType: "do" },
      select: { id: true },
    })
    if (!dossier) {
      return NextResponse.json(
        { error: "Aucun dossier dommage ouvrage ne permet ce téléchargement." },
        { status: 404 }
      )
    }

    const bytes = await generatePvReceptionVierge()
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${PV_RECEPTION_VIERGE_FILENAME}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[do-pv-reception]", error)
    return NextResponse.json({ error: "Le modèle n'a pas pu être préparé." }, { status: 500 })
  }
}
