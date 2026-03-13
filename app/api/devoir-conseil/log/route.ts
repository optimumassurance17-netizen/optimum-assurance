import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { page, produit } = body as { page?: string; produit?: string }

    if (!page || !produit) {
      return NextResponse.json({ error: "page et produit requis" }, { status: 400 })
    }

    const validPages = ["souscription", "signature", "formulaire_do", "paiement_do"]
    const validProduits = ["decennale", "dommage-ouvrage"]
    if (!validPages.includes(page) || !validProduits.includes(produit)) {
      return NextResponse.json({ error: "page ou produit invalide" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const email = body.email as string | undefined

    await prisma.devoirConseilLog.create({
      data: {
        email: email || session?.user?.email || null,
        userId: session?.user?.id || null,
        page,
        produit,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur log devoir conseil:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
