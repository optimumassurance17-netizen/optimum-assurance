import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncUserFromDocumentMergedData } from "@/lib/sync-user-document-identity"
import { resolveUserActivitiesHierarchy } from "@/lib/activity-hierarchy"
import { generateOptimizedExclusions } from "@/lib/optimized-exclusions"
import { getClientDevisAutonomyConfig } from "@/lib/client-devis-autonomy"

function parseDocumentData(value: string | null): Record<string, unknown> {
  try {
    return JSON.parse(value || "{}") as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    const document = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
      include: {
        user: { select: { raisonSociale: true, email: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const data = parseDocumentData(document.data)
    // Pour devis_do : enrichir avec les infos du user
    if (document.type === "devis_do" && document.user) {
      data.raisonSociale = document.user.raisonSociale ?? data.raisonSociale
      data.email = document.user.email ?? data.email
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- user exclu de la réponse
    const { user, ...doc } = document
    return NextResponse.json({ ...doc, data })
  } catch (error) {
    console.error("Erreur récupération document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Modification d'un devis/contrat depuis l'espace client connecté.
 * Champs autorisés: identité + activités + CA.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }

    const modifications = (body as { data?: unknown }).data
    if (!modifications || typeof modifications !== "object") {
      return NextResponse.json({ error: "data requis (objet)" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: session.user.id,
        type: { in: ["devis", "devis_do", "contrat"] },
      },
      select: { id: true, userId: true, type: true, status: true, numero: true, data: true },
    })
    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const devisAutonomy = await getClientDevisAutonomyConfig(session.user.id)
    const currentData = parseDocumentData(document.data)
    const contractCoverageLocked =
      document.type === "contrat" &&
      ["valide", "suspendu"].includes((document.status || "").toLowerCase()) &&
      !devisAutonomy.allowDevisEdition
    const editableKeys = [
      "raisonSociale",
      "siret",
      "adresse",
      "codePostal",
      "ville",
      "telephone",
      "representantLegal",
      "civilite",
      "activites",
      "chiffreAffaires",
    ] as const
    const incoming = modifications as Record<string, unknown>
    const filtered: Record<string, unknown> = {}

    for (const key of editableKeys) {
      if (!(key in incoming)) continue
      const value = incoming[key]
      if (value === undefined) continue
      if (key === "activites") {
        if (Array.isArray(value)) {
          filtered.activites = value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        } else if (typeof value === "string") {
          filtered.activites = value
            .split(/[,\n;]/)
            .map((item) => item.trim())
            .filter(Boolean)
        }
        continue
      }
      if (key === "chiffreAffaires") {
        const n = typeof value === "number" ? value : Number(value)
        if (Number.isFinite(n) && n >= 0) {
          filtered.chiffreAffaires = n
        }
        continue
      }
      filtered[key] = value
    }

    if (contractCoverageLocked && ("activites" in filtered || "chiffreAffaires" in filtered)) {
      return NextResponse.json(
        {
          error:
            "Contrat actif: la modification des activités et du chiffre d'affaires est verrouillée. Contactez la gestion pour un avenant.",
        },
        { status: 409 }
      )
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 })
    }

    const mergedData: Record<string, unknown> = { ...currentData, ...filtered }
    const forcedActivities =
      devisAutonomy.allowForcedActivities && devisAutonomy.forcedActivities.length > 0
        ? devisAutonomy.forcedActivities
        : []
    const shouldRebuildActivities = "activites" in filtered || forcedActivities.length > 0
    if (shouldRebuildActivities) {
      const baseActivities =
        "activites" in filtered
          ? filtered.activites
          : Array.isArray(currentData.activites)
            ? currentData.activites
            : typeof currentData.activites === "string"
              ? currentData.activites
                  .split(/[,\n;]/)
                  .map((item) => item.trim())
                  .filter(Boolean)
              : []
      const rawActivitiesFromInput = Array.isArray(baseActivities)
        ? baseActivities
        : typeof baseActivities === "string"
          ? baseActivities
              .split(/[,\n;]/)
              .map((item) => item.trim())
              .filter(Boolean)
          : []
      const rawActivities = [...new Set([...rawActivitiesFromInput, ...forcedActivities])]
      const hierarchy = await resolveUserActivitiesHierarchy(
        rawActivities.filter((item): item is string => typeof item === "string"),
        { userId: session.user.id }
      )
      if (!hierarchy.guaranteedActivitiesFlat.length) {
        return NextResponse.json(
          {
            error:
              "Aucune activité ne correspond à la nomenclature officielle. Merci de préciser vos activités.",
            unmatchedActivities: hierarchy.unmatched,
          },
          { status: 400 }
        )
      }
      const exclusions = generateOptimizedExclusions(
        hierarchy.guaranteedHierarchyLines.length
          ? hierarchy.guaranteedHierarchyLines
          : hierarchy.guaranteedActivitiesFlat,
        { selections: hierarchy.selections }
      )
      mergedData.activites = hierarchy.guaranteedHierarchyLines
      mergedData.activitesNormalisees = hierarchy.guaranteedActivitiesFlat
      mergedData.activitesHorsNomenclature = hierarchy.unmatched.map((item) => item.input)
      mergedData.alertsNomenclature = hierarchy.unmatched.map(
        (item) =>
          `Activité hors nomenclature: ${item.input}${
            item.suggestedActivity
              ? ` (suggestion: ${item.suggestedActivity.code} ${item.suggestedActivity.name})`
              : ""
          }`
      )
      mergedData.confidenceNomenclature = hierarchy.confidence
      mergedData.exclusionsOptimisees = exclusions.lines
      mergedData.exclusionScore = exclusions.score
      mergedData.activityExclusions = exclusions.lines
      mergedData.exclusions = exclusions.lines
      mergedData.activitesForcees = forcedActivities
    }
    await prisma.document.update({
      where: { id: document.id },
      data: { data: JSON.stringify(mergedData) },
    })

    const identitySubset: Record<string, unknown> = {}
    for (const key of ["raisonSociale", "siret", "adresse", "codePostal", "ville", "telephone"]) {
      if (key in filtered) {
        identitySubset[key] = mergedData[key]
      }
    }
    if (Object.keys(identitySubset).length > 0) {
      const sync = await syncUserFromDocumentMergedData(document.userId, identitySubset)
      if (!sync.ok) {
        await prisma.document.update({
          where: { id: document.id },
          data: { data: JSON.stringify(currentData) },
        })
        return NextResponse.json({ error: sync.error }, { status: sync.status })
      }
    }

    await prisma.adminActivityLog.create({
      data: {
        adminEmail: session.user.email || `client:${session.user.id}`,
        action: "client_document_update",
        targetType: "document",
        targetId: document.id,
        details: JSON.stringify({
          documentNumero: document.numero,
          documentType: document.type,
          changedKeys: Object.keys(filtered),
          lockedCoverage: contractCoverageLocked,
          allowDevisEditionOverride: devisAutonomy.allowDevisEdition,
          forcedActivitiesApplied: forcedActivities,
        }),
      },
    })

    return NextResponse.json({ ok: true, data: mergedData })
  } catch (error) {
    console.error("Erreur modification document client:", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification" },
      { status: 500 }
    )
  }
}
