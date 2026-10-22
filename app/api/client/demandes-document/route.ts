import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { getDevisAlertRecipientEmails } from "@/lib/devis-alert"
import { finalizeGedDirectUpload, peekGedUploadReceipt, prepareGedDirectUpload } from "@/lib/ged-direct-upload"
import { saveGedDocumentForUser } from "@/lib/ged-save"
import { SITE_URL } from "@/lib/site-url"
import {
  DOCUMENT_REQUEST_ACTION,
  readStoredDocumentRequest,
  withDocumentRequestDeposit,
} from "@/lib/document-request"
import { detectUploadMimeAndExt, MAX_FILE_SIZE } from "@/lib/user-documents"
import { sortRequestsByArrival } from "@/lib/devis-do-lead"

export const runtime = "nodejs"

const REQUEST_ID = /^[A-Za-z0-9_-]{8,80}$/

function documentRequestType(requestId: string): string {
  return `demande_${requestId}`
}

async function loadOwnRequest(userId: string, requestId: string) {
  if (!REQUEST_ID.test(requestId)) return null
  return prisma.adminActivityLog.findFirst({
    where: {
      id: requestId,
      action: DOCUMENT_REQUEST_ACTION,
      targetType: "user",
      targetId: userId,
    },
    select: { id: true, adminEmail: true, details: true, createdAt: true },
  })
}

async function notifyDeposit(input: {
  userId: string
  message: string
  assuranceLabel: string
  filename: string
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, raisonSociale: true },
  })
  const clientLabel = user?.raisonSociale?.trim() || user?.email || "Client"
  const ficheUrl = `${SITE_URL}/gestion/clients/${input.userId}`
  const alertText = [
    `${clientLabel} a déposé une pièce pour une demande de document.`,
    "",
    `Message demandé : ${input.message}`,
    `Assurance : ${input.assuranceLabel}`,
    `Fichier : ${input.filename}`,
    "",
    `Fiche : ${ficheUrl}`,
    "",
    "Ce dépôt ne confirme pas que le dossier est garanti.",
  ].join("\n")
  const recipients = getDevisAlertRecipientEmails()
  if (!recipients[0]) return
  try {
    await sendEmail({
      to: recipients[0],
      subject: `Pièce déposée — ${clientLabel}`,
      text: alertText,
      html: `<p>${escapeHtmlForEmail(clientLabel)} a déposé une pièce.</p><p>Message demandé : ${escapeHtmlForEmail(input.message)}<br>Assurance : ${escapeHtmlForEmail(input.assuranceLabel)}<br>Fichier : ${escapeHtmlForEmail(input.filename)}</p><p><a href="${escapeHtmlForEmail(ficheUrl)}">Ouvrir la fiche</a></p><p>Ce dépôt ne confirme pas que le dossier est garanti.</p>`,
    })
  } catch (error) {
    console.error("[client/demandes-document] alerte", error)
  }
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
    const requests = sortRequestsByArrival(
      logs.flatMap((log) => {
        const request = readStoredDocumentRequest(log)
        return request ? [request] : []
      })
    )
    return NextResponse.json({ requests })
  } catch (error) {
    console.error("[client/demandes-document] GET", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

async function recordDeposit(
  userId: string,
  log: { id: string; details: string | null },
  saved: { id: string; filename: string },
  current: { message: string; assuranceLabel: string }
) {
  if (!log.details) return NextResponse.json({ error: "Demande illisible." }, { status: 500 })
  const nextDetails = withDocumentRequestDeposit(log.details, {
    filename: saved.filename,
    depositedAt: new Date().toISOString(),
    userDocumentId: saved.id,
  })
  if (!nextDetails) return NextResponse.json({ error: "Demande illisible." }, { status: 500 })
  const updated = await prisma.adminActivityLog.update({
    where: { id: log.id },
    data: { details: nextDetails },
    select: { id: true, adminEmail: true, details: true, createdAt: true },
  })
  await notifyDeposit({
    userId,
    message: current.message,
    assuranceLabel: current.assuranceLabel,
    filename: saved.filename,
  })
  return NextResponse.json({ ok: true, request: readStoredDocumentRequest(updated) })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    const userId = session.user.id
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as {
        prepare?: unknown
        confirm?: unknown
        receipt?: unknown
        requestId?: unknown
        filename?: unknown
        mimeType?: unknown
        size?: unknown
      } | null
      if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })

      if (body.prepare === true) {
        const requestId = typeof body.requestId === "string" ? body.requestId.trim() : ""
        const log = await loadOwnRequest(userId, requestId)
        if (!log?.details || !readStoredDocumentRequest(log)) {
          return NextResponse.json({ error: "Demande introuvable." }, { status: 404 })
        }
        const prepared = await prepareGedDirectUpload({
          userId,
          type: documentRequestType(requestId),
          filename: typeof body.filename === "string" ? body.filename : "",
          mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
          size: typeof body.size === "number" ? body.size : Number.NaN,
        })
        if (!prepared.ok) return NextResponse.json({ error: prepared.error }, { status: prepared.status })
        return NextResponse.json({
          signedUrl: prepared.signedUrl,
          token: prepared.token,
          receipt: prepared.receipt,
        })
      }

      if (body.confirm === true) {
        if (typeof body.receipt !== "string") {
          return NextResponse.json({ error: "Dépôt incomplet." }, { status: 400 })
        }
        const peeked = peekGedUploadReceipt(body.receipt)
        const requestId = peeked?.type.startsWith("demande_") ? peeked.type.slice("demande_".length) : ""
        const log = peeked ? await loadOwnRequest(userId, requestId) : null
        const current = log ? readStoredDocumentRequest(log) : null
        if (!peeked || !log?.details || !current || peeked.type !== documentRequestType(log.id)) {
          return NextResponse.json({ error: "Demande introuvable." }, { status: 404 })
        }
        const stored = await finalizeGedDirectUpload(userId, body.receipt)
        if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: stored.status })
        return recordDeposit(userId, log, stored.doc, current)
      }

      return NextResponse.json({ error: "Requête de dépôt incomplète." }, { status: 400 })
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

    const log = await loadOwnRequest(userId, requestId)
    if (!log?.details) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 })
    }
    const current = readStoredDocumentRequest(log)
    if (!current) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const saved = await saveGedDocumentForUser({
      userId,
      type: documentRequestType(requestId),
      filename: file.name,
      bytes,
      mimeType: detected.mimeType,
      extension: detected.extension,
    })
    return recordDeposit(userId, log, saved, current)
  } catch (error) {
    console.error("[client/demandes-document] POST", error)
    return NextResponse.json({ error: "Erreur lors du dépôt" }, { status: 500 })
  }
}
