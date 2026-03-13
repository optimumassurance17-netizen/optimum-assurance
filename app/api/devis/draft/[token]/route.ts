import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const draft = await prisma.devisDraft.findUnique({
      where: { token },
    })

    if (!draft || draft.expiresAt < new Date()) {
      return NextResponse.json({ error: "Lien expiré ou invalide" }, { status: 404 })
    }

    const data = JSON.parse(draft.data || "{}")

    return NextResponse.json({ email: draft.email, data, produit: draft.produit })
  } catch (error) {
    console.error("Erreur chargement draft:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
