import { randomUUID } from "node:crypto"
import {
  FALLBACK_PDF_KEY,
  LOCAL_SIGNATURE_PROVIDER,
  MAX_LOCAL_SIGNATURE_PDF_BYTES,
} from "@/lib/esign/local-signature-fallback"

export type SignRequestCreation = {
  id: string
  signatureProvider: "local"
  fallbackPdfBase64: string
}

/**
 * Crée une demande de signature locale. Le PDF reste dans le dossier en base,
 * sans envoi vers Supabase.
 */
export async function createSignRequestWithFallback(pdfBuffer: Buffer): Promise<SignRequestCreation> {
  if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new Error("Le contrat PDF est illisible.")
  }
  if (pdfBuffer.length > MAX_LOCAL_SIGNATURE_PDF_BYTES) {
    throw new Error("Le contrat est trop volumineux pour la signature.")
  }
  return {
    id: randomUUID(),
    signatureProvider: LOCAL_SIGNATURE_PROVIDER,
    [FALLBACK_PDF_KEY]: pdfBuffer.toString("base64"),
  }
}
