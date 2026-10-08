import type { PendingSignature } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { applyPendingFinalize } from "@/lib/pending-signature-finalize"
import { applySignatureToPdf } from "@/lib/esign/apply-signature-to-pdf"
import { sha256Hex } from "@/lib/esign/hash-pdf"
import {
  FALLBACK_PDF_KEY,
  LOCAL_SIGNATURE_PROVIDER,
  LOCAL_SIGNED_PDF_KEY,
  decodeStoredPdfBase64,
  isLocalFallbackContract,
  readContractObject,
} from "@/lib/esign/local-signature-fallback"

export class LocalSignatureError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "LocalSignatureError"
    this.status = status
  }
}

/**
 * Appose la signature sur le PDF stocké dans le dossier, puis crée le contrat décennale
 * sans clé de stockage Supabase.
 */
export async function completeLocalDecennaleSignature(input: {
  pending: PendingSignature
  signaturePngDataUrl: string
  email: string
  ip: string | null
  userAgent: string | null
}): Promise<{ documentHash: string; signedDocumentUrl: string }> {
  const raw = readContractObject(input.pending.contractData)
  if (!raw || !isLocalFallbackContract(raw)) {
    throw new LocalSignatureError("Demande de signature de secours introuvable.", 404)
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

  await applyPendingFinalize({
    ...input.pending,
    contractData: JSON.stringify(nextData),
  })

  const document = await prisma.document.findFirst({
    where: {
      userId: input.pending.userId,
      numero: input.pending.contractNumero,
      type: "contrat",
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  })

  return {
    documentHash,
    signedDocumentUrl: document ? `/api/documents/${document.id}/pdf` : "/espace-client",
  }
}
