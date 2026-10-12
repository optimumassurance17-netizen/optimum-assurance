import type { PendingSignature } from "@/lib/prisma-client"
import { applyPendingFinalize } from "@/lib/pending-signature-finalize"
import { applySignatureToPdf } from "@/lib/esign/apply-signature-to-pdf"
import { sha256Hex } from "@/lib/esign/hash-pdf"
import {
  FALLBACK_PDF_KEY,
  LOCAL_SIGNATURE_PROVIDER,
  LOCAL_SIGNED_PDF_KEY,
  MAX_LOCAL_SIGNED_PDF_BYTES,
  decodeStoredPdfBase64,
  isLocalCustomPdfContract,
  isLocalFallbackContract,
  isRebuildableDecennaleContract,
  readContractObject,
} from "@/lib/esign/local-signature-fallback"
import { renderPendingDecennalePdf } from "@/lib/esign/render-pending-decennale-pdf"

export class LocalSignatureError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "LocalSignatureError"
    this.status = status
  }
}

type LocalSignatureInput = {
  pending: PendingSignature
  signaturePngDataUrl: string
  email: string
  ip: string | null
  userAgent: string | null
}

/** Signe le PDF stocké dans le dossier, puis crée le contrat sans Supabase. */
export async function completeLocalSignature(input: LocalSignatureInput) {
  const raw = readContractObject(input.pending.contractData)
  if (raw && isLocalCustomPdfContract(raw)) {
    return completeLocalCustomPdfSignature(input)
  }
  return completeLocalDecennaleSignature(input)
}

async function completeLocalCustomPdfSignature(
  input: LocalSignatureInput
): Promise<{ documentHash: string; signedDocumentUrl: string }> {
  const raw = readContractObject(input.pending.contractData)
  if (!raw || !isLocalCustomPdfContract(raw)) {
    throw new LocalSignatureError("Demande de signature introuvable.", 404)
  }
  const original = decodeStoredPdfBase64(raw[FALLBACK_PDF_KEY])
  if (!original) {
    throw new LocalSignatureError("Le PDF du contrat est illisible.", 422)
  }
  const signedAtIso = new Date().toISOString()
  let signedBytes: Uint8Array
  try {
    signedBytes = await applySignatureToPdf(original, input.signaturePngDataUrl, input.email, signedAtIso)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Traitement PDF impossible."
    throw new LocalSignatureError(message, 422)
  }
  if (signedBytes.byteLength > MAX_LOCAL_SIGNED_PDF_BYTES) {
    throw new LocalSignatureError("Le PDF signé est trop volumineux.", 422)
  }
  const documentHash = sha256Hex(signedBytes)
  await applyPendingFinalize(input.pending, {
    localSignedPdfBase64: Buffer.from(signedBytes).toString("base64"),
  })
  return { documentHash, signedDocumentUrl: "/espace-client" }
}

/**
 * Appose la signature sur le PDF stocké dans le dossier, puis crée le contrat décennale
 * sans clé de stockage Supabase.
 */
export async function completeLocalDecennaleSignature(input: LocalSignatureInput): Promise<{ documentHash: string; signedDocumentUrl: string }> {
  const raw = readContractObject(input.pending.contractData)
  if (!raw || !isLocalFallbackContract(raw)) {
    throw new LocalSignatureError("Demande de signature de secours introuvable.", 404)
  }

  const original = decodeStoredPdfBase64(raw[FALLBACK_PDF_KEY])
  if (!original) {
    throw new LocalSignatureError("Le PDF du contrat est illisible.", 422)
  }

  return completeDecennaleSignatureFromPdf({ ...input, originalPdf: original })
}

/** Signe un contrat décennale reconstruit quand Supabase ne renvoie pas le PDF original. */
export async function completeRebuiltDecennaleSignature(input: {
  pending: PendingSignature
  signaturePngDataUrl: string
  email: string
  ip: string | null
  userAgent: string | null
}): Promise<{ documentHash: string; signedDocumentUrl: string }> {
  const raw = readContractObject(input.pending.contractData)
  if (!raw || !isRebuildableDecennaleContract(raw)) {
    throw new LocalSignatureError("Ce dossier ne peut pas être signé sans le stockage.", 409)
  }
  const original = await renderPendingDecennalePdf(raw, input.pending.contractNumero)
  return completeDecennaleSignatureFromPdf({ ...input, originalPdf: original })
}

export async function completeDecennaleSignatureFromPdf(input: {
  pending: PendingSignature
  originalPdf: Uint8Array
  signaturePngDataUrl: string
  email: string
  ip: string | null
  userAgent: string | null
}): Promise<{ documentHash: string; signedDocumentUrl: string }> {
  const raw = readContractObject(input.pending.contractData)
  if (!raw) {
    throw new LocalSignatureError("Dossier de signature illisible.", 422)
  }

  const signedAtIso = new Date().toISOString()
  let signedBytes: Uint8Array
  try {
    signedBytes = await applySignatureToPdf(input.originalPdf, input.signaturePngDataUrl, input.email, signedAtIso)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Traitement PDF impossible."
    throw new LocalSignatureError(message, 422)
  }

  const documentHash = sha256Hex(signedBytes)
  const nextData: Record<string, unknown> = { ...raw }
  delete nextData[FALLBACK_PDF_KEY]
  nextData.signatureProvider = LOCAL_SIGNATURE_PROVIDER
  nextData[LOCAL_SIGNED_PDF_KEY] = Buffer.from(signedBytes).toString("base64")
  nextData.localSignatureAudit = {
    provider: LOCAL_SIGNATURE_PROVIDER,
    email: input.email,
    signedAt: signedAtIso,
    documentHash,
    ip: input.ip ? input.ip.slice(0, 80) : null,
    userAgent: input.userAgent ? input.userAgent.slice(0, 300) : null,
  }

  const finalized = await applyPendingFinalize({
    ...input.pending,
    contractData: JSON.stringify(nextData),
  })

  return {
    documentHash,
    signedDocumentUrl: finalized.documentId
      ? `/api/documents/${finalized.documentId}/pdf`
      : "/espace-client",
  }
}
