import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { renderContractPdf, type DocPdfType } from "@/lib/insurance-contract-pdf"
import { PdfValidationError } from "@/lib/pdf/errors"
import { asJsonObject } from "@/lib/json-object"

/**
 * Génère un PDF pour un InsuranceContract (admin ou propriétaire du contrat).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  try {
    const body = asJsonObject<{ contractId?: string; docType?: DocPdfType }>(await request.json())
    if (!body.contractId || !body.docType) {
      return NextResponse.json({ error: "contractId et docType requis" }, { status: 400 })
    }

    const contract = await prisma.insuranceContract.findUnique({ where: { id: body.contractId } })
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 })
    }

    const admin = isAdmin(session)
    if (!admin && contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 })
    }

    const bytes = await renderContractPdf(contract, body.docType)
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${contract.contractNumber}-${body.docType}.pdf"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""
    if (msg === "CERTIFICATE_NOT_ALLOWED" || msg === "QR_CODE_GENERATION_FAILED") {
      const isQr = msg === "QR_CODE_GENERATION_FAILED"
      return NextResponse.json(
        {
          error: isQr
            ? "Génération du QR de vérification impossible."
            : "Attestation non disponible (paiement ou validation assureur requis)",
        },
        { status: isQr ? 503 : 403 }
      )
    }
    if (e instanceof PdfValidationError) {
      const status = e.code === "CERTIFICATE_BLOCKED" ? 403 : 400
      return NextResponse.json({ error: e.message, code: e.code }, { status })
    }
    console.error(e)
    return NextResponse.json({ error: "Erreur génération" }, { status: 500 })
  }
}
