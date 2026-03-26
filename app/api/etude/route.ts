import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Enregistre une demande d'étude :
 * - dossier sinistres (>1) depuis le devis (session /etude)
 * - activité non listée depuis /etude/domaine (data.type === "domaine_non_liste")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, raisonSociale, siret, data } = body

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email valide requis" }, { status: 400 })
    }

    const dataObj = typeof data === "object" && data !== null ? data : {}
    const MIN_DESC_DOMAINE = 20
    if (
      (dataObj as { type?: string }).type === "domaine_non_liste" &&
      (!(dataObj as { descriptionActivite?: string }).descriptionActivite ||
        String((dataObj as { descriptionActivite: string }).descriptionActivite).trim().length < MIN_DESC_DOMAINE)
    ) {
      return NextResponse.json(
        { error: `Décrivez votre activité en au moins ${MIN_DESC_DOMAINE} caractères.` },
        { status: 400 }
      )
    }

    const emailNorm = email.trim().toLowerCase()
    const dataStr = typeof data === "string" ? data : JSON.stringify(data ?? {})

    await prisma.devisEtudeLead.create({
      data: {
        email: emailNorm,
        raisonSociale: raisonSociale?.trim() || undefined,
        siret: siret?.replace(/\D/g, "").slice(0, 14) || undefined,
        data: dataStr,
        statut: "pending",
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur enregistrement étude:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement" },
      { status: 500 }
    )
  }
}
