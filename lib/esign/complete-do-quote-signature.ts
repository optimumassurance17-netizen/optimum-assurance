import type { PendingSignature } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { logContractAction } from "@/lib/insurance-contract-service"
import { applySignatureToPdf } from "@/lib/esign/apply-signature-to-pdf"
import { sha256Hex } from "@/lib/esign/hash-pdf"
import {
  FALLBACK_PDF_KEY,
  LOCAL_DOCUMENT_KEY_PREFIX,
  LOCAL_SIGNED_DOCUMENT_TYPE,
  LOCAL_SIGNED_PDF_KEY,
  MAX_LOCAL_SIGNED_PDF_BYTES,
  decodeStoredPdfBase64,
  readContractObject,
} from "@/lib/esign/local-signature-fallback"
import { LocalSignatureError } from "@/lib/esign/local-signature-error"
import {
  DO_QUOTE_AFTER_SIGN_PATH,
  isDoQuoteSignatureData,
} from "@/lib/do-quote-signature-rules"

type LocalSignatureInput = {
  pending: PendingSignature
  signaturePngDataUrl: string
  email: string
  ip: string | null
  userAgent: string | null
}

/** Signe le devis DO déjà émis et débloque le virement. Ne crée pas un second contrat. */
export async function completeDoQuoteSignature(
  input: LocalSignatureInput
): Promise<{ documentHash: string; signedDocumentUrl: string }> {
  const raw = readContractObject(input.pending.contractData)
  if (!isDoQuoteSignatureData(raw)) {
    throw new LocalSignatureError("Demande de signature introuvable.", 404)
  }
  const contractId = raw.insuranceContractId.trim()
  const original = decodeStoredPdfBase64(raw[FALLBACK_PDF_KEY])
  if (!original) {
    throw new LocalSignatureError("Le PDF du devis est illisible.", 422)
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
  const signedPdfBase64 = Buffer.from(signedBytes).toString("base64")
  const archive = await prisma.document.create({
    data: {
      userId: input.pending.userId,
      type: LOCAL_SIGNED_DOCUMENT_TYPE,
      numero: await getNextNumero(LOCAL_SIGNED_DOCUMENT_TYPE),
      data: JSON.stringify({
        [LOCAL_SIGNED_PDF_KEY]: signedPdfBase64,
        signatureRequestId: input.pending.signatureRequestId,
        insuranceContractId: contractId,
        documentHash,
        signedAt: signedAtIso,
        signerEmail: input.email,
      }),
      status: "valide",
    },
  })
  const signedKey = `${LOCAL_DOCUMENT_KEY_PREFIX}${archive.id}`

  const updated = await prisma.insuranceContract.updateMany({
    where: { id: contractId, productType: "do" },
    data: { signedQuoteStorageKey: signedKey },
  })
  if (updated.count !== 1) {
    await prisma.document.delete({ where: { id: archive.id } }).catch(() => undefined)
    throw new LocalSignatureError("Le devis à signer est introuvable.", 404)
  }

  await prisma.pendingSignature.deleteMany({
    where: { signatureRequestId: input.pending.signatureRequestId },
  })
  await logContractAction(contractId, "do_quote_signed", {
    signatureRequestId: input.pending.signatureRequestId,
    documentHash,
    signerEmail: input.email,
    ip: input.ip,
    userAgent: input.userAgent,
  })

  return { documentHash, signedDocumentUrl: DO_QUOTE_AFTER_SIGN_PATH }
}
