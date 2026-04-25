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
import { validateSignatureQualityGate } from "@/lib/signature-quality-gates"
import { resolveUserActivitiesHierarchy } from "@/lib/activity-hierarchy"
import { generateOptimizedExclusions } from "@/lib/optimized-exclusions"

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
    const payload = body as { documentId?: unknown }
    const documentId = typeof payload.documentId === "string" ? payload.documentId.trim() : ""
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
    const sourceActivities = Array.isArray(baseContract.activites)
      ? (baseContract.activites as unknown[])
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : []
    if (!sourceActivities.length) {
      return NextResponse.json({ error: "Au moins une activité est requise." }, { status: 400 })
    }
    const hierarchy = await resolveUserActivitiesHierarchy(sourceActivities, {
      userId: doc.userId,
    })
    if (!hierarchy.guaranteedHierarchyLines.length) {
      return NextResponse.json(
        {
          error:
            "Aucune activité ne correspond à la nomenclature officielle. Merci d'ajuster les activités du devis.",
          unmatchedActivities: hierarchy.unmatched,
        },
        { status: 400 }
      )
    }
    baseContract.activites = hierarchy.guaranteedHierarchyLines
    baseContract.activitesNormalisees = hierarchy.guaranteedActivitiesFlat
    const optimizedExclusions = generateOptimizedExclusions(
      hierarchy.guaranteedHierarchyLines.length
        ? hierarchy.guaranteedHierarchyLines
        : hierarchy.guaranteedActivitiesFlat,
      { selections: hierarchy.selections }
    )
    baseContract.exclusionsOptimisees = optimizedExclusions.lines
    baseContract.exclusionScore = optimizedExclusions.score
    baseContract.activitesHorsNomenclature = hierarchy.unmatched.map((item) => item.input)
    baseContract.alertsNomenclature = hierarchy.unmatched.map(
      (item) =>
        `Activité hors nomenclature: ${item.input}${
          item.suggestedActivity
            ? ` (suggestion: ${item.suggestedActivity.code} ${item.suggestedActivity.name})`
            : ""
        }`
    )
    baseContract.confidenceNomenclature = hierarchy.confidence

    const validationError = validateDevisContractData(baseContract)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const qualityError = validateSignatureQualityGate({
      flow: "decennale",
      annualTtc: Number(baseContract.primeAnnuelle),
      periodicity: "trimestriel",
      clientLabel: String(baseContract.raisonSociale || doc.user.raisonSociale || doc.user.email || "Client"),
      reference: String(baseContract.numero || contractNumero),
      email: String(baseContract.email || doc.user.email || ""),
      address: [baseContract.adresse, baseContract.codePostal, baseContract.ville]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .join(" "),
      siret: String(baseContract.siret || ""),
      legalRepresentative: String(baseContract.representantLegal || ""),
      activitiesCount: Array.isArray(baseContract.activites) ? baseContract.activites.length : 0,
    })
    if (qualityError) {
      return NextResponse.json(
        {
          error: qualityError,
        },
        { status: 400 }
      )
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
    const sent = await sendEmail({
      to: doc.user.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    })
    if (!sent) {
      await prisma.pendingSignature.deleteMany({ where: { signatureRequestId: signRequestId } })
      return NextResponse.json(
        { error: "Envoi e-mail impossible (RESEND_API_KEY / domaine expéditeur)" },
        { status: 503 }
      )
    }

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
