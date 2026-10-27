import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import {
  completeLocalSignature,
  completeRebuiltDecennaleSignature,
  LocalSignatureError,
} from "@/lib/esign/complete-local-signature"
import { getClientIp, getUserAgent } from "@/lib/esign/get-request-meta"
import {
  isLocalSignableContract,
  isRebuildableDecennaleContract,
  readContractObject,
  safeLogMessage,
} from "@/lib/esign/local-signature-fallback"
import type { PendingSignature } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_SIGNATURE_IMAGE_BYTES = 2 * 1024 * 1024
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

async function rebuiltDecennaleResponse(
  pending: PendingSignature | null,
  signature: string,
  emailNorm: string,
  request: NextRequest
) {
  if (!pending || !isRebuildableDecennaleContract(readContractObject(pending.contractData))) return null
  try {
    const local = await completeRebuiltDecennaleSignature({
      pending,
      signaturePngDataUrl: signature,
      email: emailNorm,
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    })
    return NextResponse.json({
      ok: true,
      signatureMode: "local",
      signatureId: pending.signatureRequestId,
      documentHash: local.documentHash,
      signedDocumentUrl: local.signedDocumentUrl,
    })
  } catch (error) {
    if (error instanceof LocalSignatureError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[api/sign] signature reconstruite", safeLogMessage(error))
    return NextResponse.json(
      {
        error:
          "La finalisation du contrat a échoué. Vous pouvez réessayer, ou contacter le support avec votre e-mail.",
      },
      { status: 500 }
    )
  }
}

function isValidPngDataUrl(s: string): boolean {
  if (!s.startsWith("data:image/png;base64,")) return false
  const b64 = s.slice("data:image/png;base64,".length).trim()
  if (b64.length < 80) return false
  if (b64.length > MAX_SIGNATURE_IMAGE_BYTES * 4) return false
  try {
    const buf = Buffer.from(b64, "base64")
    if (buf.length < 32 || buf.length > MAX_SIGNATURE_IMAGE_BYTES) return false
    return buf.subarray(0, 8).equals(PNG_SIGNATURE)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Objet JSON attendu." }, { status: 400 })
  }

  const { documentId, signature, email, agreed } = body as Record<string, unknown>

  if (agreed !== true) {
    return NextResponse.json({ error: "Vous devez accepter de signer le document." }, { status: 400 })
  }

  if (typeof documentId !== "string" || !UUID_RE.test(documentId.trim())) {
    return NextResponse.json({ error: "Identifiant de document invalide." }, { status: 400 })
  }

  if (typeof email !== "string" || email.trim().length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 })
  }

  if (typeof signature !== "string" || !isValidPngDataUrl(signature)) {
    return NextResponse.json({ error: "Signature vide ou image invalide." }, { status: 400 })
  }

  const id = documentId.trim()
  const emailNorm = email.trim().toLowerCase()

  const pending = await prisma.pendingSignature.findUnique({
    where: { signatureRequestId: id },
  })
  if (pending && isLocalSignableContract(readContractObject(pending.contractData))) {
    try {
      const local = await completeLocalSignature({
        pending,
        signaturePngDataUrl: signature,
        email: emailNorm,
        ip: getClientIp(request),
        userAgent: getUserAgent(request),
      })
      return NextResponse.json({
        ok: true,
        signatureMode: "local",
        signatureId: id,
        documentHash: local.documentHash,
        signedDocumentUrl: local.signedDocumentUrl,
      })
    } catch (error) {
      if (error instanceof LocalSignatureError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      console.error("[api/sign] signature locale", safeLogMessage(error))
      return NextResponse.json(
        {
          error: "La finalisation du contrat a échoué. Vous pouvez réessayer, ou contacter le support avec votre e-mail.",
        },
        { status: 500 }
      )
    }
  }

  const rebuilt = await rebuiltDecennaleResponse(pending, signature, emailNorm, request)
  if (rebuilt) return rebuilt

  return NextResponse.json({ error: "Demande de signature introuvable." }, { status: 404 })
}
