import { NextRequest, NextResponse } from "next/server"
import { generateDecennaleCertificate } from "@/lib/pdf/decennale/generateCertificate"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { logPdfGeneration } from "@/lib/pdf/logPdfGeneration"
import {
  handlePdfError,
  isPdfApiAuthorized,
  pdfApiUnauthorizedResponse,
  pdfBufferResponse,
} from "@/lib/pdf/api-helpers"
import type { InsuranceCertificateData } from "@/lib/pdf/types"
import { asJsonObject } from "@/lib/json-object"

export async function POST(request: NextRequest) {
  if (!isPdfApiAuthorized(request)) {
    return pdfApiUnauthorizedResponse()
  }
  try {
    const body = asJsonObject<{
      data?: InsuranceCertificateData
      allocateContractNumber?: boolean
      userId?: string
    }>(await request.json())
    if (!body.data) {
      return NextResponse.json({ error: "Champ data requis" }, { status: 400 })
    }
    const data = { ...body.data }
    if (body.allocateContractNumber) {
      data.contractNumber = await allocateNextContractNumber("decennale")
    }
    const bytes = await generateDecennaleCertificate(data)
    await logPdfGeneration({
      contractNumber: data.contractNumber,
      productType: "decennale",
      documentType: "certificate",
      userId: body.userId,
    })
    return pdfBufferResponse(bytes, `attestation-decennale-${data.contractNumber}.pdf`)
  } catch (e) {
    return handlePdfError(e)
  }
}
