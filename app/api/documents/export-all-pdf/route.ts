import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DocumentsCombinedPDF } from "@/components/pdf/DocumentsCombinedPDF"
import { qrCodePngDataUri } from "@/lib/qr-pdf"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      include: { user: { select: { raisonSociale: true, email: true } } },
      orderBy: { createdAt: "desc" },
    })

    if (documents.length === 0) {
      return NextResponse.json({ error: "Aucun document à exporter" }, { status: 400 })
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")

    const docsWithData = await Promise.all(
      documents.map(async (doc) => {
        const data = JSON.parse(doc.data) as Record<string, unknown>
        if (doc.type === "devis_do" && doc.user) {
          data.raisonSociale = doc.user.raisonSociale ?? data.raisonSociale
          data.email = doc.user.email ?? data.email
        }
        if (
          (doc.type === "attestation" || doc.type === "attestation_do") &&
          doc.verificationToken
        ) {
          const verificationUrl = `${baseUrl}/v/${doc.verificationToken}`
          data.verificationUrl = verificationUrl
          try {
            data.verificationQrDataUri = await qrCodePngDataUri(verificationUrl)
          } catch (e) {
            console.warn("[export-all-pdf] Génération QR:", e)
          }
        }
        return {
          id: doc.id,
          type: doc.type,
          numero: doc.numero,
          data,
        }
      })
    )

    const pdfElement = React.createElement(DocumentsCombinedPDF, { documents: docsWithData })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- renderToBuffer attend un Document react-pdf
    const pdfBuffer = await renderToBuffer(pdfElement as any)

    const filename = `documents-optimum-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Erreur export PDF groupé:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    )
  }
}
