import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { emailNotSentBody, sendEmail } from "@/lib/email"
import { logContractAction } from "@/lib/insurance-contract-service"
import { getInsuranceProductLabel } from "@/lib/insurance-product"
import { SITE_URL } from "@/lib/site-url"
import {
  DOCUMENT_REQUEST_ACTION,
  buildDocumentRequestEmail,
  documentRequestScope,
  documentTypeAssuranceLabel,
  parseDocumentRequestMessage,
  readStoredDocumentRequest,
} from "@/lib/document-request"

function oneId(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

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
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const payload = body as Record<string, unknown>
    const userId = oneId(payload.userId)
    const insuranceContractId = oneId(payload.insuranceContractId)
    const documentId = oneId(payload.documentId)
    const targets = [userId, insuranceContractId, documentId].filter(Boolean)
    if (targets.length !== 1) {
      return NextResponse.json(
        { error: "Indiquez le client ou l'assurance concernée." },
        { status: 400 }
      )
    }

    const parsedMessage = parseDocumentRequestMessage(payload.message)
    if (!parsedMessage.ok) {
      return NextResponse.json({ error: parsedMessage.error }, { status: 400 })
    }

    let recipient: { id: string; email: string; raisonSociale: string | null } | null = null
    let productLabel = ""
    let reference = ""

    if (userId) {
      recipient = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, raisonSociale: true },
      })
      if (!recipient) {
        return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
      }
    } else if (insuranceContractId) {
      const contract = await prisma.insuranceContract.findUnique({
        where: { id: insuranceContractId },
        select: {
          id: true,
          contractNumber: true,
          productType: true,
          user: { select: { id: true, email: true, raisonSociale: true } },
        },
      })
      if (!contract) {
        return NextResponse.json({ error: "Assurance introuvable" }, { status: 404 })
      }
      if (!contract.user?.email?.trim()) {
        return NextResponse.json(
          { error: "Aucun compte client lié à cette assurance. La demande n'a pas été envoyée." },
          { status: 400 }
        )
      }
      recipient = contract.user
      productLabel = getInsuranceProductLabel(contract.productType)
      reference = contract.contractNumber
    } else {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          type: true,
          numero: true,
          user: { select: { id: true, email: true, raisonSociale: true } },
        },
      })
      if (!document) {
        return NextResponse.json({ error: "Assurance introuvable" }, { status: 404 })
      }
      if (!document.user?.email?.trim()) {
        return NextResponse.json(
          { error: "Aucun email client sur cette assurance. La demande n'a pas été envoyée." },
          { status: 400 }
        )
      }
      recipient = document.user
      productLabel = documentTypeAssuranceLabel(document.type)
      reference = document.numero
    }

    const clientEmail = recipient.email.trim()
    if (!clientEmail) {
      return NextResponse.json(
        { error: "Aucun email client. La demande n'a pas été envoyée." },
        { status: 400 }
      )
    }
    const adminEmail = session.user.email?.trim().toLowerCase() || ""
    if (adminEmail && clientEmail.toLowerCase() === adminEmail) {
      return NextResponse.json(
        {
          error:
            "L'email de cette fiche est le même que votre compte administrateur. La demande n'a pas été envoyée.",
        },
        { status: 400 }
      )
    }

    const scope = documentRequestScope({ productLabel, reference })
    const email = buildDocumentRequestEmail({
      clientLabel: recipient.raisonSociale?.trim() || clientEmail,
      message: parsedMessage.message,
      scopePhrase: scope.scopePhrase,
      subject: scope.subject,
      espaceClientUrl: `${SITE_URL}/espace-client`,
    })
    const sent = await sendEmail({
      to: clientEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })
    if (!sent) {
      return NextResponse.json(emailNotSentBody())
    }

    const details = {
      message: parsedMessage.message,
      sentTo: clientEmail,
      assuranceLabel: scope.assuranceLabel,
      userId: recipient.id,
      ...(insuranceContractId ? { insuranceContractId } : {}),
      ...(documentId ? { documentId, documentNumber: reference } : {}),
    }
    const actor = session.user.email?.trim() || "admin"
    let requestView = null
    try {
      const log = await prisma.adminActivityLog.create({
        data: {
          adminEmail: actor,
          action: DOCUMENT_REQUEST_ACTION,
          targetType: "user",
          targetId: recipient.id,
          details: JSON.stringify(details),
        },
        select: { id: true, adminEmail: true, details: true, createdAt: true },
      })
      requestView = readStoredDocumentRequest(log)
    } catch (error) {
      console.error("[gestion/demande-document] journal", error)
    }

    if (insuranceContractId) {
      try {
        await logContractAction(insuranceContractId, DOCUMENT_REQUEST_ACTION, details, actor)
      } catch (error) {
        console.error("[gestion/demande-document] journal contrat", error)
      }
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      sentTo: clientEmail,
      request: requestView,
    })
  } catch (error) {
    console.error("[gestion/demande-document]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
