import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { getDevisAlertRecipientEmails } from "@/lib/devis-alert"
import { saveGedDocumentForUser } from "@/lib/ged-save"
import { SITE_URL } from "@/lib/site-url"
import {
  DOCUMENT_REQUEST_ACTION,
  readStoredDocumentRequest,
  withDocumentRequestDeposit,
} from "@/lib/document-request"
import { detectUploadMimeAndExt, MAX_FILE_SIZE } from "@/lib/user-documents"

export const runtime = "nodejs"

const REQUEST_ID = /^[A-Za-z0-9_-]{8,80}$/

function documentRequestType(requestId: string): string {
  return `demande_${requestId}`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const logs = await prisma.adminActivityLog.findMany({
      where: {
        action: DOCUMENT_REQUEST_ACTION,
        targetType: "user",
        targetId: session.user.id,
      },
      select: { id: true, adminEmail: true, details: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    const requests = logs.flatMap((log) => {
      const request = readStoredDocumentRequest(log)
      return request ? [request] : []
    })
    return NextResponse.json({ requests })
  } catch (error) {
    console.error("[client/demandes-document] GET", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const formData = await request.formData()
    const requestId = typeof formData.get("requestId") === "string" ? String(formData.get("requestId")).trim() : ""
    const file = formData.get("file")
    if (!REQUEST_ID.test(requestId)) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choisissez le fichier à déposer." }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Le fichier doit faire au plus 10 Mo." }, { status: 400 })
    }
    const detected = detectUploadMimeAndExt(file)
    if (!detected) {
      return NextResponse.json(
        { error: "Format non autorisé (PDF, JPEG, PNG, WebP uniquement)." },
        { status: 400 }
      )
    }

    const log = await prisma.adminActivityLog.findFirst({
      where: {
        id: requestId,
        action: DOCUMENT_REQUEST_ACTION,
        targetType: "user",
        targetId: session.user.id,
      },
      select: { id: true, adminEmail: true, details: true, createdAt: true },
    })
    if (!log?.details) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 })
    }
    const current = readStoredDocumentRequest(log)
    if (!current) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const saved = await saveGedDocumentForUser({
      userId: session.user.id,
      type: documentRequestType(requestId),
      filename: file.name,
      bytes,
      mimeType: detected.mimeType,
      extension: detected.extension,
    })
    const depositedAt = new Date().toISOString()
    const nextDetails = withDocumentRequestDeposit(log.details, {
      filename: saved.filename,
      depositedAt,
      userDocumentId: saved.id,
    })
    if (!nextDetails) {
      return NextResponse.json({ error: "Demande illisible." }, { status: 500 })
    }
    const updated = await prisma.adminActivityLog.update({
      where: { id: log.id },
      data: { details: nextDetails },
      select: { id: true, adminEmail: true, details: true, createdAt: true },
    })
    const stored = readStoredDocumentRequest(updated)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, raisonSociale: true },
    })
    const clientLabel = user?.raisonSociale?.trim() || user?.email || "Client"
    const ficheUrl = `${SITE_URL}/gestion/clients/${session.user.id}`
    const alertText = [
      `${clientLabel} a déposé une pièce pour une demande de document.`,
      "",
      `Message demandé : ${current.message}`,
      `Assurance : ${current.assuranceLabel}`,
      `Fichier : ${saved.filename}`,
      "",
      `Fiche : ${ficheUrl}`,
      "",
      "Ce dépôt ne confirme pas que le dossier est garanti.",
    ].join("\n")
    const recipients = getDevisAlertRecipientEmails()
    if (recipients[0]) {
      try {
        await sendEmail({
          to: recipients[0],
          subject: `Pièce déposée — ${clientLabel}`,
          text: alertText,
          html: `<p>${escapeHtmlForEmail(clientLabel)} a déposé une pièce.</p><p>Message demandé : ${escapeHtmlForEmail(current.message)}<br>Assurance : ${escapeHtmlForEmail(current.assuranceLabel)}<br>Fichier : ${escapeHtmlForEmail(saved.filename)}</p><p><a href="${escapeHtmlForEmail(ficheUrl)}">Ouvrir la fiche</a></p><p>Ce dépôt ne confirme pas que le dossier est garanti.</p>`,
        })
      } catch (error) {
        console.error("[client/demandes-document] alerte", error)
      }
    }

    return NextResponse.json({ ok: true, request: stored })
  } catch (error) {
    console.error("[client/demandes-document] POST", error)
    return NextResponse.json({ error: "Erreur lors du dépôt" }, { status: 500 })
  }
}
