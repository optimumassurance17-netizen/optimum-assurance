import { NextRequest, NextResponse } from "next/server"
import { calculerTarif, CA_MINIMUM } from "@/lib/tarification"
import { resolveUserActivities } from "@/lib/activity-nomenclature"
import { formatResolutionForDocuments } from "@/lib/activity-nomenclature-format"

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const raw = body as Record<string, unknown>
    const chiffreAffaires = raw.chiffreAffaires
    const sinistres = raw.sinistres
    const jamaisAssure = raw.jamaisAssure
    const resilieNonPaiement = raw.resilieNonPaiement
    const activites = raw.activites
    const reprisePasse = raw.reprisePasse

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

    const activityResolution = await resolveUserActivities(
      Array.isArray(activites) ? activites.filter((value): value is string => typeof value === "string") : []
    )
    if (activityResolution.matched.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucune activité ne correspond à la nomenclature officielle France Assureurs 2019. Merci de reformuler vos activités.",
          unmatchedActivities: activityResolution.unmatched.map((item) => item.userInput),
        },
        { status: 400 }
      )
    }
    const result = calculerTarif({
      chiffreAffaires: Number(chiffreAffaires),
      sinistres: Number(sinistres),
      jamaisAssure: Boolean(jamaisAssure),
      resilieNonPaiement: Boolean(resilieNonPaiement),
      activites: activityResolution.matched.map((item) => item.name),
      reprisePasse: Boolean(reprisePasse),
    })
    const projection = formatResolutionForDocuments(activityResolution)

    return NextResponse.json({
      ...result,
      matchedActivities: projection.guaranteedLines,
      unmatchedActivities: activityResolution.unmatched.map((item) => item.userInput),
      nomenclatureAlerts: projection.uncoveredAlerts,
      confidence: activityResolution.matched.map((item) => ({
        code: item.code,
        name: item.name,
        score: item.score,
        confidenceLabel: item.confidenceLabel,
      })),
    })
  } catch (error) {
    console.error("Erreur calcul devis:", error)
    return NextResponse.json(
      { error: "Erreur lors du calcul" },
      { status: 500 }
    )
  }
}
