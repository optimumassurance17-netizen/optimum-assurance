import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseActivitiesJson, parseExclusionsJson } from "@/lib/insurance-contract-activities"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"

export const dynamic = "force-dynamic"

/**
 * Vérification publique par numéro de contrat (JSON).
 * Par défaut : réponse minimale (pas de nom client ni adresse chantier — limite l’énumération).
 * Ajouter `?detail=1` pour l’ancien format détaillé (compatibilité).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractNumber: string }> }
) {
  const { contractNumber: raw } = await params
  const contractNumber = decodeURIComponent(raw)
  const detail = request.nextUrl.searchParams.get("detail") === "1"

  let contract
  try {
    contract = await prisma.insuranceContract.findUnique({
      where: { contractNumber },
    })
  } catch {
    return NextResponse.json({
      valid: false,
      displayStatus: "inactive",
      message: "Vérification temporairement indisponible",
    })
  }

  if (!contract) {
    return NextResponse.json({
      valid: false,
      displayStatus: "inactive",
      message: "Attestation invalide ou contrat non actif",
    })
  }

  const now = new Date()
  const isActive =
    contract.status === CONTRACT_STATUS.active &&
    contract.validUntil != null &&
    contract.validUntil > now

  if (!detail) {
    return NextResponse.json({
      valid: isActive,
      displayStatus: isActive ? "active" : "inactive",
      productType: contract.productType,
      validFrom: contract.validFrom?.toISOString() ?? null,
      validUntil: contract.validUntil?.toISOString() ?? null,
      message: isActive ? undefined : "Attestation invalide ou contrat non actif",
    })
  }

  const activities = parseActivitiesJson(contract.activitiesJson)
  const activityExclusions = parseExclusionsJson(contract.exclusionsJson)
  const optimizedExclusions = extractOptimizedExclusionLines({
    activityExclusions,
  })

  return NextResponse.json({
    valid: isActive,
    clientName: contract.clientName,
    status: contract.status,
    displayStatus: isActive ? "active" : "inactive",
    productType: contract.productType,
    validFrom: contract.validFrom?.toISOString() ?? null,
    validUntil: contract.validUntil?.toISOString() ?? null,
    activities: contract.productType === "decennale" ? activities : activities.length ? activities : undefined,
    activityExclusions:
      optimizedExclusions.length > 0
        ? optimizedExclusions
        : activityExclusions.length
          ? activityExclusions
          : undefined,
    projectName: contract.productType === "do" ? contract.projectName : undefined,
    projectAddress: contract.productType === "do" ? contract.projectAddress : undefined,
    message: isActive ? undefined : "Attestation invalide ou contrat non actif",
  })
}
