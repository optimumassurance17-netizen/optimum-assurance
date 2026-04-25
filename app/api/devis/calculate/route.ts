import { NextRequest, NextResponse } from "next/server"
import { calculerTarif, CA_MINIMUM } from "@/lib/tarification"
import { resolveUserActivitiesHierarchy } from "@/lib/activity-hierarchy"

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

    const activitesInput = Array.isArray(activites)
      ? activites
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : []

    const hierarchy = await resolveUserActivitiesHierarchy(activitesInput)
    if (!hierarchy.guaranteedActivitiesFlat.length) {
      return NextResponse.json(
        {
          error:
            "Aucune activité n'a pu être rattachée à la nomenclature officielle. Merci de préciser vos activités.",
          unmatchedActivities: hierarchy.unmatched,
          nomenclatureAlerts: hierarchy.unmatched.map(
            (item) =>
              `Activité hors nomenclature: ${item.input}${
                item.suggestedActivity
                  ? ` (suggestion: ${item.suggestedActivity.code} ${item.suggestedActivity.name})`
                  : ""
              }`
          ),
        },
        { status: 400 }
      )
    }

    const result = calculerTarif({
      chiffreAffaires: Number(chiffreAffaires),
      sinistres: Number(sinistres),
      jamaisAssure: Boolean(jamaisAssure),
      resilieNonPaiement: Boolean(resilieNonPaiement),
      activites: activitesInput,
      reprisePasse: Boolean(reprisePasse),
    })

    return NextResponse.json({
      ...result,
      matchedActivities: hierarchy.guaranteedActivitiesFlat,
      matchedHierarchy: hierarchy.guaranteedHierarchyLines,
      unmatchedActivities: hierarchy.unmatched,
      nomenclatureAlerts: hierarchy.unmatched.map(
        (item) =>
          `Activité hors nomenclature: ${item.input}${
            item.suggestedActivity
              ? ` (suggestion: ${item.suggestedActivity.code} ${item.suggestedActivity.name})`
              : ""
          }`
      ),
      confidence: hierarchy.confidence,
    })
  } catch (error) {
    console.error("Erreur calcul devis:", error)
    return NextResponse.json(
      { error: "Erreur lors du calcul" },
      { status: 500 }
    )
  }
}
