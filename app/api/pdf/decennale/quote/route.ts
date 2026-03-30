import { NextRequest, NextResponse } from "next/server"
import { generateDecennaleQuote } from "@/lib/pdf/decennale/generateQuote"
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
      data.contractNumber = await allocateNextContractNumber("decennale")
    }
    const bytes = await generateDecennaleQuote(data)
    await logPdfGeneration({
      contractNumber: data.contractNumber,
      productType: "decennale",
      documentType: "quote",
      userId: body.userId,
    })
    return pdfBufferResponse(bytes, `devis-decennale-${data.contractNumber}.pdf`)
  } catch (e) {
    return handlePdfError(e)
  }
}
