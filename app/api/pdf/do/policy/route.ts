import { NextRequest, NextResponse } from "next/server"
import { generateDOPolicy } from "@/lib/pdf/do/generatePolicy"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { logPdfGeneration } from "@/lib/pdf/logPdfGeneration"
import { handlePdfError, isPdfApiAuthorized, pdfBufferResponse } from "@/lib/pdf/api-helpers"
import type { InsuranceData } from "@/lib/pdf/types"

export async function POST(request: NextRequest) {
  if (!isPdfApiAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }
  try {
    const body = (await request.json()) as {
      data?: InsuranceData
      allocateContractNumber?: boolean
      userId?: string
    }
    if (!body.data) {
      return NextResponse.json({ error: "Champ data requis" }, { status: 400 })
    }
    const data = { ...body.data }
    if (body.allocateContractNumber) {
      data.contractNumber = await allocateNextContractNumber("do")
    }
    const bytes = await generateDOPolicy(data)
    await logPdfGeneration({
      contractNumber: data.contractNumber,
      productType: "do",
      documentType: "policy",
      userId: body.userId,
    })
    return pdfBufferResponse(bytes, `conditions-particulieres-do-${data.contractNumber}.pdf`)
  } catch (e) {
    return handlePdfError(e)
  }
}
