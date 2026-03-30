import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CONTRACT_STATUS } from "@/lib/insurance-contract-status"

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

  const contract = await prisma.insuranceContract.findUnique({
    where: { contractNumber },
  })

  if (!contract) {
    return NextResponse.json({
      valid: false,
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

  const activities = contract.activitiesJson
    ? (JSON.parse(contract.activitiesJson) as string[])
    : []

  return NextResponse.json({
    valid: isActive,
    clientName: contract.clientName,
    status: contract.status,
    displayStatus: isActive ? "active" : "inactive",
    productType: contract.productType,
    validFrom: contract.validFrom?.toISOString() ?? null,
    validUntil: contract.validUntil?.toISOString() ?? null,
    activities: contract.productType === "decennale" ? activities : undefined,
    projectName: contract.productType === "do" ? contract.projectName : undefined,
    projectAddress: contract.productType === "do" ? contract.projectAddress : undefined,
    message: isActive ? undefined : "Attestation invalide ou contrat non actif",
  })
}
