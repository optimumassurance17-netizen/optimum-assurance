import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createInsuranceContract } from "@/lib/insurance-contract-service"
import { logAdminActivity } from "@/lib/admin-activity"
import { resolveUserActivitiesHierarchy } from "@/lib/activity-hierarchy"
import { generateOptimizedExclusions } from "@/lib/optimized-exclusions"
import {
  assertRecentDdaConsent,
  buildDdaNeedSummary,
  buildDdaSuitabilityStatement,
  normalizeDdaProduct,
} from "@/lib/dda-compliance"

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function asOptionalNonNegativeNumber(value: unknown): number | null | undefined {
  if (value == null) return null
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
    }

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
    const productType = raw.productType === "decennale" || raw.productType === "do" ? raw.productType : undefined
    const clientName = asTrimmedString(raw.clientName)
    const address = asTrimmedString(raw.address)
    const premium = asPositiveNumber(raw.premium)
    const activities = Array.isArray(raw.activities)
      ? raw.activities
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : undefined
    const exclusions = Array.isArray(raw.exclusions)
      ? raw.exclusions
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : undefined
    const siret = asTrimmedString(raw.siret)
    const projectName = asTrimmedString(raw.projectName)
    const projectAddress = asTrimmedString(raw.projectAddress)
    const constructionNature = asTrimmedString(raw.constructionNature)
    const missingDocuments = typeof raw.missingDocuments === "boolean" ? raw.missingDocuments : undefined
    const companyAgeMonths = asOptionalNonNegativeNumber(raw.companyAgeMonths)
    const expectedDdaProduct = normalizeDdaProduct(productType)

    if (!productType || !clientName || !address) {
      return NextResponse.json({ error: "Champs requis : productType, clientName, address" }, { status: 400 })
    }
    if (premium == null) {
      return NextResponse.json({ error: "premium invalide" }, { status: 400 })
    }
    if (productType === "decennale" && (!activities || activities.length === 0)) {
      return NextResponse.json({ error: "activities requis (décennale)" }, { status: 400 })
    }
    if (productType === "do" && (!projectName || !projectAddress)) {
      return NextResponse.json({ error: "projectName et projectAddress requis (DO)" }, { status: 400 })
    }
    if (companyAgeMonths === undefined) {
      return NextResponse.json({ error: "companyAgeMonths invalide" }, { status: 400 })
    }
    const ddaCheck = await assertRecentDdaConsent(session.user.id, expectedDdaProduct, 72)
    if (!ddaCheck.ok) {
      return NextResponse.json(
        {
          error: ddaCheck.reason,
          dda: { expectedProduct: expectedDdaProduct, requiredFreshConsent: true },
        },
        { status: 412 }
      )
    }

    const hierarchy =
      productType === "decennale" && activities?.length
        ? await resolveUserActivitiesHierarchy(activities, { userId: session.user.id })
        : null
    const matchedActivities = hierarchy?.guaranteedActivitiesFlat ?? activities ?? []
    const nomenclatureAlerts =
      hierarchy?.unmatched.map(
        (item) =>
          `Activité hors nomenclature: ${item.input}${
            item.suggestedActivity
              ? ` (suggestion: ${item.suggestedActivity.code} ${item.suggestedActivity.name})`
              : ""
          }`
      ) ?? []

    if (productType === "decennale" && matchedActivities.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucune activité ne correspond à la nomenclature officielle. Merci de préciser vos activités.",
          unmatchedActivities: hierarchy?.unmatched ?? [],
          nomenclatureAlerts,
        },
        { status: 400 }
      )
    }

    const optimizedExclusions =
      productType === "decennale"
        ? generateOptimizedExclusions(
            hierarchy?.guaranteedHierarchyLines.length
              ? hierarchy.guaranteedHierarchyLines
              : matchedActivities,
            { selections: hierarchy?.selections }
          )
        : null
    const ddaNeedsSummary = buildDdaNeedSummary({
      insuranceProduct: productType === "do" ? "do" : "decennale",
      companyName: clientName,
      activitiesCount: matchedActivities.length,
      turnover: asPositiveNumber(raw.chiffreAffaires),
      projectName,
      projectAddress,
    })
    const ddaSuitability = buildDdaSuitabilityStatement({
      productType: expectedDdaProduct ?? (productType === "do" ? "dommage-ouvrage" : "decennale"),
      matchedActivities,
      missingActivitiesCount: hierarchy?.unmatched.length ?? 0,
      riskReasons: [],
      exclusions: optimizedExclusions?.lines ?? [],
      sourcePage: ddaCheck.log.page,
    })
    const mergedExclusionsRaw = [
      ...(exclusions ?? []),
      ...(optimizedExclusions?.lines ?? []),
      ...nomenclatureAlerts,
    ]
    const mergedExclusions = [...new Set(mergedExclusionsRaw)]

    const { contract, risk } = await createInsuranceContract({
      productType,
      clientName,
      siret,
      address,
      activities:
        productType === "decennale"
          ? hierarchy?.guaranteedHierarchyLines ?? matchedActivities
          : matchedActivities,
      exclusions: mergedExclusions,
      projectName,
      projectAddress,
      constructionNature,
      premium,
      userId: session.user.id,
      missingDocuments,
      companyAgeMonths,
    })

    await logAdminActivity({
      adminEmail: "dda@system",
      action: "dda_contract_suitability_checked",
      targetType: "insurance_contract",
      targetId: contract.id,
      details: {
        consentLogId: ddaCheck.log.id,
        acceptedAt: ddaCheck.log.acceptedAt,
        page: ddaCheck.log.page,
        productLogged: ddaCheck.log.produit,
        needsSummary: ddaNeedsSummary,
        suitability: ddaSuitability,
        riskReasons: risk.reasons,
      },
    })

    return NextResponse.json({
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        riskScore: risk.score,
        riskReasons: risk.reasons,
        rejectedReason: contract.rejectedReason,
        matchedActivities,
        matchedHierarchy: hierarchy?.guaranteedHierarchyLines ?? [],
        unmatchedActivities: hierarchy?.unmatched ?? [],
        nomenclatureAlerts,
        confidence: hierarchy?.confidence ?? null,
        optimizedExclusions: optimizedExclusions?.lines ?? [],
        exclusionScore: optimizedExclusions?.score ?? null,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erreur création contrat" }, { status: 500 })
  }
}
