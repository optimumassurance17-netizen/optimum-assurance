import { NextRequest, NextResponse } from "next/server"
import { calculerTarif, CA_MINIMUM } from "@/lib/tarification"
import { asJsonObject } from "@/lib/json-object"

export async function POST(request: NextRequest) {
  try {
    const body = asJsonObject<{
      chiffreAffaires?: number
      sinistres?: number
      jamaisAssure?: boolean
      resilieNonPaiement?: boolean
      activites?: string[]
      reprisePasse?: boolean
    }>(await request.json())
    const { chiffreAffaires, sinistres, jamaisAssure, resilieNonPaiement, activites, reprisePasse } = body

    if (
      typeof chiffreAffaires !== "number" ||
      chiffreAffaires < CA_MINIMUM ||
      typeof sinistres !== "number" ||
      sinistres < 0
    ) {
      return NextResponse.json(
        { error: `Chiffre d'affaires minimum : ${CA_MINIMUM.toLocaleString("fr-FR")} €` },
        { status: 400 }
      )
    }

    const result = calculerTarif({
      chiffreAffaires: Number(chiffreAffaires),
      sinistres: Number(sinistres),
      jamaisAssure: Boolean(jamaisAssure),
      resilieNonPaiement: Boolean(resilieNonPaiement),
      activites: Array.isArray(activites) ? activites : [],
      reprisePasse: Boolean(reprisePasse),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erreur calcul devis:", error)
    return NextResponse.json(
      { error: "Erreur lors du calcul" },
      { status: 500 }
    )
  }
}
