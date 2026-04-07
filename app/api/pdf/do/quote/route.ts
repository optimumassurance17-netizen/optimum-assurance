import { NextRequest, NextResponse } from "next/server"
import { generateDOQuote } from "@/lib/pdf/do/generateQuote"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { logPdfGeneration } from "@/lib/pdf/logPdfGeneration"
import {
  handlePdfError,
  isPdfApiAuthorized,
  pdfApiUnauthorizedResponse,
  pdfBufferResponse,
} from "@/lib/pdf/api-helpers"
import type { InsuranceData } from "@/lib/pdf/types"
import { asJsonObject } from "@/lib/json-object"

export async function POST(request: NextRequest) {
  if (!isPdfApiAuthorized(request)) {
    return pdfApiUnauthorizedResponse()
  }
  try {
    const body = asJsonObject<{
      data?: InsuranceData
      allocateContractNumber?: boolean
      userId?: string
    }>(await request.json())
    if (!body.data) {
      return NextResponse.json({ error: "Champ data requis" }, { status: 400 })
    }
    const data = { ...body.data }
    if (body.allocateContractNumber) {
      data.contractNumber = await allocateNextContractNumber("do")
    }
    const bytes = await generateDOQuote(data)
    await logPdfGeneration({
      contractNumber: data.contractNumber,
      productType: "do",
      documentType: "quote",
      userId: body.userId,
    })
    return pdfBufferResponse(bytes, `devis-do-${data.contractNumber}.pdf`)
  } catch (e) {
    return handlePdfError(e)
  }
}
