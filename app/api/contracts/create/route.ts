import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createInsuranceContract } from "@/lib/insurance-contract-service"
import { asJsonObject } from "@/lib/json-object"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
    }

    const body = asJsonObject<{
      productType?: "decennale" | "do"
      clientName?: string
      siret?: string
      address?: string
      activities?: string[]
      exclusions?: string[]
      projectName?: string
      projectAddress?: string
      constructionNature?: string
      premium?: number
      missingDocuments?: boolean
      companyAgeMonths?: number | null
    }>(await request.json())

    if (!body.productType || !body.clientName?.trim() || !body.address?.trim()) {
      return NextResponse.json({ error: "Champs requis : productType, clientName, address" }, { status: 400 })
    }
    if (typeof body.premium !== "number" || body.premium <= 0) {
      return NextResponse.json({ error: "premium invalide" }, { status: 400 })
    }
    if (body.productType === "decennale" && (!body.activities || body.activities.length === 0)) {
      return NextResponse.json({ error: "activities requis (décennale)" }, { status: 400 })
    }
    if (body.productType === "do" && (!body.projectName?.trim() || !body.projectAddress?.trim())) {
      return NextResponse.json({ error: "projectName et projectAddress requis (DO)" }, { status: 400 })
    }

    const { contract, risk } = await createInsuranceContract({
      productType: body.productType,
      clientName: body.clientName.trim(),
      siret: body.siret,
      address: body.address.trim(),
      activities: body.activities,
      exclusions: body.exclusions,
      projectName: body.projectName,
      projectAddress: body.projectAddress,
      constructionNature: body.constructionNature,
      premium: body.premium,
      userId: session.user.id,
      missingDocuments: body.missingDocuments,
      companyAgeMonths: body.companyAgeMonths,
    })

    return NextResponse.json({
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        riskScore: risk.score,
        riskReasons: risk.reasons,
        rejectedReason: contract.rejectedReason,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erreur création contrat" }, { status: 500 })
  }
}
