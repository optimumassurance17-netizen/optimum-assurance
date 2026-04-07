import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { ContratPDF } from "@/components/pdf/ContratPDF"
import {
  buildContractDataFromDevisForSignature,
  validateDevisContractData,
} from "@/lib/gestion-contract-from-devis"
import { uploadPdfAndInsertSignRequest } from "@/lib/esign/upload-pdf-and-insert-sign-request"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"

export const runtime = "nodejs"

/**
 * Admin : à partir d’un document **devis** décennale, génère le contrat PDF, crée une demande
 * `sign_requests` (Supabase Sign) pour le client et envoie le lien `/sign/[id]` par email.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const documentId =
      typeof (body as Record<string, unknown>).documentId === "string"
        ? (body as Record<string, unknown>).documentId.trim()
        : ""
    if (!documentId) {
      return NextResponse.json({ error: "documentId requis" }, { status: 400 })
    }

    if (!createSupabaseServiceClient()) {
      return NextResponse.json(
        { error: "Signature électronique non configurée (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)." },
        { status: 503 }
      )
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
    const baseContract = buildContractDataFromDevisForSignature(devisData, doc.user, contractNumero, {
      id: doc.id,
      numero: doc.numero,
    })

    const validationError = validateDevisContractData(baseContract)
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
            "Une demande de signature est déjà en attente pour ce client. Finalisez ou annulez-la avant d’en créer une nouvelle.",
        },
        { status: 409 }
      )
    }

    const contractData = { ...baseContract, signatureProvider: "supabase" as const }

    const pdfElement = React.createElement(ContratPDF, {
      numero: contractNumero,
      data: baseContract as React.ComponentProps<typeof ContratPDF>["data"],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = Buffer.from(await renderToBuffer(pdfElement as any))

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const folder = randomUUID()
    const storagePath = `gestion/devis/${folder}/contrat-${contractNumero}.pdf`

    const { id: signRequestId } = await uploadPdfAndInsertSignRequest(pdfBuffer, storagePath)

    await prisma.pendingSignature.create({
      data: {
        signatureRequestId: signRequestId,
        userId: doc.userId,
        contractData: JSON.stringify(contractData),
        contractNumero,
      },
    })

    const nextPath = "/signature/callback?success=1"
    const signatureLink = `${baseUrl}/sign/${signRequestId}?next=${encodeURIComponent(nextPath)}`

    const raison = String(baseContract.raisonSociale || doc.user.raisonSociale || doc.user.email)
    const tpl = EMAIL_TEMPLATES.invitationSignatureDecennale(raison, signatureLink, doc.numero)
    await sendEmail({
      to: doc.user.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "signature_send_from_devis",
      targetType: "document",
      targetId: doc.id,
      details: { contractNumero, signatureRequestId: signRequestId, clientUserId: doc.userId },
    })

    return NextResponse.json({
      ok: true,
      signatureRequestId: signRequestId,
      contractNumero,
      signatureLink,
    })
  } catch (error) {
    console.error("[gestion/sign/send-from-devis]", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de la création de la signature",
      },
      { status: 500 }
    )
  }
}
