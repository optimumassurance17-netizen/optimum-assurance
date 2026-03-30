import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { renderContractPdf, type DocPdfType } from "@/lib/insurance-contract-pdf"

const ALLOWED: DocPdfType[] = ["quote", "policy", "certificate", "invoice"]

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
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${contract.contractNumber}-${docType}.pdf"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur"
    if (msg === "CERTIFICATE_NOT_ALLOWED") {
      return NextResponse.json(
        { error: "Attestation non disponible (paiement ou validation assureur requis)" },
        { status: 403 }
      )
    }
    console.error(e)
    return NextResponse.json({ error: "Génération PDF impossible" }, { status: 500 })
  }
}
