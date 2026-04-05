import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { ContratPDF } from "@/components/pdf/ContratPDF"
import { createSignatureRequest } from "@/lib/yousign"
import {
  buildContractDataForYousignFromDevis,
  validateDevisForYousign,
} from "@/lib/gestion-contract-from-devis"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"

/**
 * Admin : à partir d’un document **devis** décennale, génère le contrat PDF, crée une demande Yousign
 * pour le **client** (propriétaire du document) et envoie le lien par email.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await request.json()
    const documentId = typeof body.documentId === "string" ? body.documentId.trim() : ""
    if (!documentId) {
      return NextResponse.json({ error: "documentId requis" }, { status: 400 })
    }

    if (!process.env.YOUSIGN_API_KEY) {
      return NextResponse.json({ error: "Yousign non configuré (YOUSIGN_API_KEY)" }, { status: 503 })
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            raisonSociale: true,
            siret: true,
            adresse: true,
            codePostal: true,
            ville: true,
          },
        },
      },
    })

    if (!doc || doc.type !== "devis") {
      return NextResponse.json(
        { error: "Document introuvable ou ce n’est pas un devis décennale." },
        { status: 404 }
      )
    }

    let devisData: Record<string, unknown> = {}
    try {
      devisData = JSON.parse(doc.data || "{}") as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: "Données du devis invalides" }, { status: 400 })
    }

    const contractNumero = await getNextNumero("contrat")
    const contractData = buildContractDataForYousignFromDevis(devisData, doc.user, contractNumero, {
      id: doc.id,
      numero: doc.numero,
    })

    const validationError = validateDevisForYousign(contractData)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const existingPending = await prisma.pendingSignature.findFirst({
      where: { userId: doc.userId },
    })
    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "Une demande de signature est déjà en attente pour ce client. Finalisez ou annulez-la côté Yousign avant d’en créer une nouvelle.",
        },
        { status: 409 }
      )
    }

    const pdfElement = React.createElement(ContratPDF, {
      numero: contractNumero,
      data: contractData as React.ComponentProps<typeof ContratPDF>["data"],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const repr = String(contractData.representantLegal || "Signataire")
    const [firstName, ...lastParts] = repr.trim().split(/\s+/)
    const lastName = lastParts.join(" ") || "Signataire"

    const result = await createSignatureRequest(
      Buffer.from(pdfBuffer),
      `contrat-${contractNumero}.pdf`,
      {
        name: `Contrat décennale - ${String(contractData.raisonSociale)}`,
        signerInfo: {
          first_name: firstName || "Signataire",
          last_name: lastName,
          email: doc.user.email,
          locale: "fr",
        },
        redirectUrls: {
          success: `${baseUrl}/signature/callback?success=1`,
          error: `${baseUrl}/signature/callback?error=1`,
        },
      }
    )

    const signer = result.signers?.[0] as { signature_link?: string } | undefined
    const signatureLink = signer?.signature_link

    if (!signatureLink) {
      return NextResponse.json({ error: "Lien de signature non disponible" }, { status: 500 })
    }

    await prisma.pendingSignature.create({
      data: {
        signatureRequestId: result.id,
        userId: doc.userId,
        contractData: JSON.stringify(contractData),
        contractNumero,
      },
    })

    const raison = String(contractData.raisonSociale || doc.user.raisonSociale || doc.user.email)
    const tpl = EMAIL_TEMPLATES.invitationSignatureYousignDecennale(raison, signatureLink, doc.numero)
    await sendEmail({
      to: doc.user.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "yousign_send_from_devis",
      targetType: "document",
      targetId: doc.id,
      details: { contractNumero, signatureRequestId: result.id, clientUserId: doc.userId },
    })

    return NextResponse.json({
      ok: true,
      signatureRequestId: result.id,
      contractNumero,
      signatureLink,
    })
  } catch (error) {
    console.error("[gestion/yousign/create-from-devis]", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la création de la signature",
      },
      { status: 500 }
    )
  }
}
