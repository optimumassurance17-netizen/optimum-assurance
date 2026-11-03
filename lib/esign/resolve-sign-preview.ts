import "server-only"
import {
  isLocalSignableContract,
  isRebuildableDecennaleContract,
  readContractObject,
  safeLogMessage,
} from "@/lib/esign/local-signature-fallback"
import { prisma } from "@/lib/prisma"
import { isQuoteExpired } from "@/lib/quote-validity"

export type SignPreview =
  | { kind: "local"; documentId: string }
  | { kind: "expired" }
  | { kind: "missing" }

async function loadPending(id: string): Promise<{ contractData: string; createdAt: Date } | null> {
  try {
    return await prisma.pendingSignature.findUnique({
      where: { signatureRequestId: id },
      select: { contractData: true, createdAt: true },
    })
  } catch (error) {
    console.error("[esign] dossier signature", safeLogMessage(error))
    return null
  }
}

/** Aperçu du contrat à signer. Le PDF reste dans le dossier, sans Supabase. */
export async function resolveSignPreview(id: string): Promise<SignPreview> {
  const pending = await loadPending(id)
  if (!pending) return { kind: "missing" }
  const pendingData = readContractObject(pending.contractData)
  if (!isLocalSignableContract(pendingData) && !isRebuildableDecennaleContract(pendingData)) {
    return { kind: "missing" }
  }
  if (isQuoteExpired(pending.createdAt)) return { kind: "expired" }
  return { kind: "local", documentId: id }
}
