import "server-only"
import {
  isLocalSignableContract,
  isRebuildableDecennaleContract,
  readContractObject,
  safeLogMessage,
} from "@/lib/esign/local-signature-fallback"
import { prisma } from "@/lib/prisma"

export type SignPreview =
  | { kind: "local"; documentId: string }
  | { kind: "missing" }

async function loadPendingContract(id: string): Promise<Record<string, unknown> | null> {
  try {
    const pending = await prisma.pendingSignature.findUnique({
      where: { signatureRequestId: id },
      select: { contractData: true },
    })
    if (!pending) return null
    return readContractObject(pending.contractData)
  } catch (error) {
    console.error("[esign] dossier signature", safeLogMessage(error))
    return null
  }
}

/** Aperçu du contrat à signer. Le PDF reste dans le dossier, sans Supabase. */
export async function resolveSignPreview(id: string): Promise<SignPreview> {
  const pendingData = await loadPendingContract(id)
  if (isLocalSignableContract(pendingData) || isRebuildableDecennaleContract(pendingData)) {
    return { kind: "local", documentId: id }
  }
  return { kind: "missing" }
}
