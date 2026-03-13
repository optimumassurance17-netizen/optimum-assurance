import { NextRequest, NextResponse } from "next/server"
import { fetchEntrepriseBySiret } from "@/lib/sirene"

/**
 * Recherche entreprise par SIRET
 * Utilise l'API Sirene INSEE (gratuite) en priorité, sinon Pappers
 * Voir .env.example pour les variables à configurer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siret = searchParams.get("siret")?.replace(/\s/g, "")

    if (!siret || siret.length !== 14 || !/^\d+$/.test(siret)) {
      return NextResponse.json({ error: "SIRET invalide (14 chiffres)" }, { status: 400 })
    }

    const result = await fetchEntrepriseBySiret(siret)

    if (!result) {
      const hasInsee =
        process.env.INSEE_SIRENE_API_KEY ||
        process.env.INSEE_API_KEY_INTEGRATION ||
        (process.env.INSEE_CONSUMER_KEY && process.env.INSEE_CONSUMER_SECRET)
      const hasPappers = process.env.PAPPERS_API_KEY
      return NextResponse.json(
        {
          error: hasInsee || hasPappers ? "Entreprise introuvable" : "API SIRET non configurée",
        },
        { status: hasInsee || hasPappers ? 404 : 503 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erreur SIRET:", error)
    return NextResponse.json({ error: "Erreur lors de la recherche" }, { status: 500 })
  }
}
