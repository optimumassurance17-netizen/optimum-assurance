import "server-only"
import { ESIGN_BUCKET_ORIGINALS } from "@/lib/esign/buckets"
import {
  isLocalFallbackContract,
  readContractObject,
  safeLogMessage,
} from "@/lib/esign/local-signature-fallback"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"

const SUPABASE_LOOKUP_MS = 8_000

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

async function lookupSupabase(id: string): Promise<RemoteLookup> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) return { kind: "unconfigured" }

  const query = async (): Promise<RemoteLookup> => {
    const { data: row, error } = await supabase
      .from("sign_requests")
      .select("id, document_storage_path")
      .eq("id", id)
      .maybeSingle()

    if (error) return { kind: "unavailable" }
    if (!row?.document_storage_path || typeof row.id !== "string") return { kind: "missing" }

    const { data: signed, error: signErr } = await supabase.storage
      .from(ESIGN_BUCKET_ORIGINALS)
      .createSignedUrl(row.document_storage_path, 3600)

    if (signErr || !signed?.signedUrl) return { kind: "unavailable" }
    return { kind: "ok", documentId: row.id, url: signed.signedUrl }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      query(),
      new Promise<RemoteLookup>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "unavailable" }), SUPABASE_LOOKUP_MS)
      }),
    ])
    return result
  } catch (error) {
    console.error("[esign] lecture signature", safeLogMessage(error))
    return { kind: "unavailable" }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function hasLocalFallback(id: string): Promise<boolean> {
  const pending = await prisma.pendingSignature.findUnique({
    where: { signatureRequestId: id },
    select: { contractData: true },
  })
  if (!pending) return false
  return isLocalFallbackContract(readContractObject(pending.contractData))
}

export async function resolveSignPreview(id: string): Promise<SignPreview> {
  const remote = await lookupSupabase(id)
  if (remote.kind === "ok") {
    return { kind: "supabase", documentId: remote.documentId, url: remote.url }
  }
  if (await hasLocalFallback(id)) {
    return { kind: "local", documentId: id }
  }
  if (remote.kind === "unconfigured") return { kind: "unconfigured" }
  if (remote.kind === "unavailable") return { kind: "unavailable" }
  return { kind: "missing" }
}
