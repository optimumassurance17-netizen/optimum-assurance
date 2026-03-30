import { NextRequest, NextResponse } from "next/server"
import { generateDecennaleCertificate } from "@/lib/pdf/decennale/generateCertificate"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { logPdfGeneration } from "@/lib/pdf/logPdfGeneration"
import { handlePdfError, isPdfApiAuthorized, pdfBufferResponse } from "@/lib/pdf/api-helpers"
import type { InsuranceCertificateData } from "@/lib/pdf/types"

export async function POST(request: NextRequest) {
  if (!isPdfApiAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }
  try {
    const body = (await request.json()) as {
      data?: InsuranceCertificateData
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
