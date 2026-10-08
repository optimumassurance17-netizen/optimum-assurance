import { randomUUID } from "node:crypto"
import { uploadPdfAndInsertSignRequest } from "@/lib/esign/upload-pdf-and-insert-sign-request"
import {
  FALLBACK_PDF_KEY,
  LOCAL_SIGNATURE_PROVIDER,
  MAX_LOCAL_SIGNATURE_PDF_BYTES,
  isSupabaseConnectivityError,
  safeLogMessage,
} from "@/lib/esign/local-signature-fallback"

export type SignRequestCreation = {
  id: string
  signatureProvider: "supabase" | "local"
  fallbackPdfBase64?: string
}

/**
 * Tente Supabase, puis bascule sur un identifiant local si le projet est injoignable.
 * Le PDF n'est renvoyé au navigateur que s'il est retiré ensuite de la réponse.
 */
export async function createSignRequestWithFallback(
  pdfBuffer: Buffer,
  storagePath: string
): Promise<SignRequestCreation> {
  try {
    const uploaded = await uploadPdfAndInsertSignRequest(pdfBuffer, storagePath)
    return { id: uploaded.id, signatureProvider: "supabase" }
  } catch (error) {
    if (!isSupabaseConnectivityError(error)) throw error
    if (pdfBuffer.length > MAX_LOCAL_SIGNATURE_PDF_BYTES) {
      throw new Error("Le contrat est trop volumineux pour la signature de secours.")
    }
    console.error("[esign] signature de secours", safeLogMessage(error))
    return {
      id: randomUUID(),
      signatureProvider: LOCAL_SIGNATURE_PROVIDER,
      [FALLBACK_PDF_KEY]: pdfBuffer.toString("base64"),
    }
  }
}
