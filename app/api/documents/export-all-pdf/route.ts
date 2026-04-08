import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DocumentsCombinedPDF } from "@/components/pdf/DocumentsCombinedPDF"
import { qrCodePngDataUri } from "@/lib/qr-pdf"

type AssuranceFilter = "decennale" | "do" | "rc_fabriquant"

const DOC_TYPES_BY_ASSURANCE: Record<AssuranceFilter, Set<string>> = {
  decennale: new Set([
    "devis",
    "contrat",
    "attestation",
    "attestation_non_sinistralite",
    "facture_decennale",
    "avenant",
  ]),
  do: new Set(["devis_do", "attestation_do", "facture_do"]),
  // RC Fabriquant passe principalement par les PDFs de contrats plateforme (/api/contracts/:id/pdf/*).
  rc_fabriquant: new Set(),
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assurance = searchParams.get("assurance")
    if (
      assurance !== "decennale" &&
      assurance !== "do" &&
      assurance !== "rc_fabriquant"
    ) {
      return NextResponse.json(
        { error: "Paramètre assurance requis: decennale, do ou rc_fabriquant" },
        { status: 400 }
      )
    }

    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      include: { user: { select: { raisonSociale: true, email: true } } },
      orderBy: { createdAt: "desc" },
    })

    const allowedTypes = DOC_TYPES_BY_ASSURANCE[assurance]
    const filteredDocuments = documents.filter((doc) => allowedTypes.has(doc.type))

    if (filteredDocuments.length === 0) {
      const message =
        assurance === "rc_fabriquant"
          ? "Aucun document exportable RC Fabriquant sur ce flux (utilisez les PDFs du contrat plateforme)."
          : "Aucun document à exporter pour cette assurance."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")

    const docsWithData = await Promise.all(
      filteredDocuments.map(async (doc) => {
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

    const filename = `documents-optimum-${assurance}-${new Date().toISOString().slice(0, 10)}.pdf`

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
