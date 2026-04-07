import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { renderContractPdf, type DocPdfType } from "@/lib/insurance-contract-pdf"
import { PdfValidationError } from "@/lib/pdf/errors"

const ALLOWED: DocPdfType[] = ["quote", "policy", "certificate", "invoice", "schedule"]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docType: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id, docType } = await params
    if (!ALLOWED.includes(docType as DocPdfType)) {
      return NextResponse.json({ error: "Type inconnu" }, { status: 400 })
    }

    const contract = await prisma.insuranceContract.findUnique({ where: { id } })
    if (!contract) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 })
    }

    const admin = isAdmin(session)
    if (!admin && contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const bytes = await renderContractPdf(contract, docType as DocPdfType)
    const bundleDevisCp =
      (contract.productType === "do" || contract.productType === "decennale") &&
      (docType === "quote" || docType === "policy")
    const filename = bundleDevisCp
      ? `${contract.contractNumber}-devis-et-cp.pdf`
      : `${contract.contractNumber}-${docType}.pdf`
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur"
    if (msg === "CERTIFICATE_NOT_ALLOWED" || msg === "QR_CODE_GENERATION_FAILED") {
      const body =
        msg === "QR_CODE_GENERATION_FAILED"
          ? "Génération du QR de vérification impossible. Réessayez ou contactez le support."
          : "Attestation non disponible (paiement ou validation assureur requis)"
      return NextResponse.json({ error: body }, { status: msg === "QR_CODE_GENERATION_FAILED" ? 503 : 403 })
    }
    if (e instanceof PdfValidationError) {
      const status = e.code === "CERTIFICATE_BLOCKED" ? 403 : 400
      return NextResponse.json({ error: e.message, code: e.code }, { status })
    }
    console.error(e)
    return NextResponse.json({ error: "Génération PDF impossible" }, { status: 500 })
  }
}
