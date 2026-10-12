import "server-only"
import { ESIGN_BUCKET_ORIGINALS } from "@/lib/esign/buckets"
import {
  isLocalFallbackContract,
  isRebuildableDecennaleContract,
  readContractObject,
  safeLogMessage,
} from "@/lib/esign/local-signature-fallback"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"

const SUPABASE_LOOKUP_MS = 4_500

export type SignPreview =
  | { kind: "supabase"; documentId: string; url: string }
  | { kind: "local"; documentId: string }
  | { kind: "unconfigured" }
  | { kind: "unavailable" }
  | { kind: "missing" }

type RemoteLookup =
  | { kind: "ok"; documentId: string; url: string }
  | { kind: "unconfigured" }
  | { kind: "unavailable" }
  | { kind: "missing" }

function whenAborted(signal: AbortSignal): Promise<RemoteLookup> {
  if (signal.aborted) return Promise.resolve({ kind: "unavailable" })
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve({ kind: "unavailable" }), { once: true })
  })
}

async function lookupSupabase(id: string, signal: AbortSignal): Promise<RemoteLookup> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) return { kind: "unconfigured" }

  const query = async (): Promise<RemoteLookup> => {
    const { data: row, error } = await supabase
      .from("sign_requests")
      .select("id, document_storage_path")
      .eq("id", id)
      .abortSignal(signal)
      .maybeSingle()

    if (signal.aborted || error) return { kind: "unavailable" }
    if (!row?.document_storage_path || typeof row.id !== "string") return { kind: "missing" }

    const signed = await supabase.storage
      .from(ESIGN_BUCKET_ORIGINALS)
      .createSignedUrl(row.document_storage_path, 3600)

    if (signal.aborted || signed.error || !signed.data?.signedUrl) return { kind: "unavailable" }
    return { kind: "ok", documentId: row.id, url: signed.data.signedUrl }
  }

  try {
    return await Promise.race([
      query(),
      whenAborted(signal),
    ])
  } catch (error) {
    console.error("[esign] lecture signature", safeLogMessage(error))
    return { kind: "unavailable" }
  }
}

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

export async function resolveSignPreview(id: string): Promise<SignPreview> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SUPABASE_LOOKUP_MS)
  const remotePromise = lookupSupabase(id, controller.signal).finally(() => clearTimeout(timer))
  const pendingData = await loadPendingContract(id)

  if (isLocalFallbackContract(pendingData)) {
    controller.abort()
    return { kind: "local", documentId: id }
  }

  const remote = await remotePromise
  if (remote.kind === "ok") {
    return { kind: "supabase", documentId: remote.documentId, url: remote.url }
  }
  if (isRebuildableDecennaleContract(pendingData)) {
    return { kind: "local", documentId: id }
  }
  if (remote.kind === "unconfigured") return { kind: "unconfigured" }
  if (remote.kind === "unavailable") return { kind: "unavailable" }
  return { kind: "missing" }
}
