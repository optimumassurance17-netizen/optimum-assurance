import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DocumentsCombinedPDF } from "@/components/pdf/DocumentsCombinedPDF"
import { qrCodePngDataUri } from "@/lib/qr-pdf"
import { SITE_URL } from "@/lib/site-url"

const QR_ENABLED_TYPES = new Set(["attestation", "attestation_nominative", "attestation_do"])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Identifiant document manquant" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
      include: { user: { select: { raisonSociale: true, email: true } } },
    })
    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(document.data) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: "Document invalide (JSON illisible)" }, { status: 422 })
    }

    if (document.type === "devis_do" && document.user) {
      data.raisonSociale = document.user.raisonSociale ?? data.raisonSociale
      data.email = document.user.email ?? data.email
    }

    if (QR_ENABLED_TYPES.has(document.type) && document.verificationToken) {
      const verificationUrl = `${SITE_URL.replace(/\/+$/, "")}/v/${document.verificationToken}`
      data.verificationUrl = verificationUrl
      try {
        data.verificationQrDataUri = await qrCodePngDataUri(verificationUrl)
      } catch (error) {
        console.warn("[documents/:id/pdf] QR indisponible:", error)
      }
    }

    const pdfElement = React.createElement(DocumentsCombinedPDF, {
      documents: [{ id: document.id, type: document.type, numero: document.numero, data }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- renderToBuffer attend un Document react-pdf
    const pdfBuffer = await renderToBuffer(pdfElement as any)
    const filename = `${document.numero}.pdf`

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[documents/:id/pdf] GET", error)
    return NextResponse.json({ error: "Erreur lors de la génération du PDF" }, { status: 500 })
  }
}
