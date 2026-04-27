import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { applyPendingFinalize } from "@/lib/pending-signature-finalize"
import { ESIGN_BUCKET_ORIGINALS, ESIGN_BUCKET_SIGNED } from "@/lib/esign/buckets"
import { logAdminActivity } from "@/lib/admin-activity"

const UUID_RE = /^[0-9a-f-]{36}$/i

function normalizeStoragePath(path: string): string {
  return decodeURIComponent(path).replace(/^\/+/, "").trim()
}

function extractBucketPathFromUrl(url: string, bucket: string): string | null {
  const raw = url.trim()
  if (!raw) return null
  const plainBucketPrefix = `${bucket}/`
  if (raw.startsWith(plainBucketPrefix)) {
    return normalizeStoragePath(raw.slice(plainBucketPrefix.length))
  }
  const directBucket = raw.indexOf(`/${bucket}/`)
  if (directBucket >= 0) {
    const segment = raw.slice(directBucket + bucket.length + 2).split("?")[0]
    return normalizeStoragePath(segment)
  }
  const objectPrefix = `/object/public/${bucket}/`
  const objectSignedPrefix = `/object/sign/${bucket}/`
  const objectAuthPrefix = `/object/authenticated/${bucket}/`
  for (const prefix of [objectPrefix, objectSignedPrefix, objectAuthPrefix]) {
    const idx = raw.indexOf(prefix)
    if (idx >= 0) {
      const segment = raw.slice(idx + prefix.length).split("?")[0]
      return normalizeStoragePath(segment)
    }
  }
  return null
}

function extractSignedKey(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  const marker = `/${ESIGN_BUCKET_SIGNED}/`
  const idx = raw.indexOf(marker)
  if (idx >= 0) {
    const key = raw.slice(idx + marker.length).split("?")[0].trim()
    return key ? decodeURIComponent(key) : null
  }
  const bucketPath = extractBucketPathFromUrl(raw, ESIGN_BUCKET_SIGNED)
  if (bucketPath) return bucketPath
  if (!raw.includes("://") && !raw.startsWith("/")) {
    return decodeURIComponent(raw.replace(/^signed_documents\//, "").trim())
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }
    const signatureRequestId =
      typeof (body as { signatureRequestId?: unknown }).signatureRequestId === "string"
        ? ((body as { signatureRequestId?: string }).signatureRequestId ?? "").trim()
        : ""
    if (!UUID_RE.test(signatureRequestId)) {
      return NextResponse.json({ error: "signatureRequestId invalide" }, { status: 400 })
    }

    const pending = await prisma.pendingSignature.findUnique({
      where: { signatureRequestId },
    })
    if (!pending) {
      return NextResponse.json(
        { error: "Aucune signature en attente trouvée pour cet identifiant." },
        { status: 404 }
      )
    }

    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Configuration Supabase incomplète (clé service)." },
        { status: 503 }
      )
    }

    /**
     * Compatibilité schéma:
     * - certains environnements n'ont pas `signatures.request_id`.
     * - on récupère donc la signature via l'URL du document original portée par `sign_requests`.
     */
    const { data: signRequestRow, error: signReqErr } = await supabase
      .from("sign_requests")
      .select("document_storage_path")
      .eq("id", signatureRequestId)
      .maybeSingle()

    if (signReqErr) {
      return NextResponse.json(
        { error: "Lecture de la demande de signature Supabase impossible." },
        { status: 502 }
      )
    }

    const documentStoragePath = signRequestRow?.document_storage_path as string | undefined
    if (!documentStoragePath || !documentStoragePath.trim()) {
      return NextResponse.json(
        { error: "Demande de signature introuvable côté Supabase (document source absent)." },
        { status: 409 }
      )
    }

    const { data: originalPublic } = supabase.storage
      .from(ESIGN_BUCKET_ORIGINALS)
      .getPublicUrl(documentStoragePath.trim())
    const originalDocumentUrl = originalPublic.publicUrl
    const normalizedOriginalPath = normalizeStoragePath(documentStoragePath)
    const encodedOriginalPath = encodeURIComponent(normalizedOriginalPath).replace(/%2F/g, "/")

    const { data: signedRowsInitial, error: signedErr } = await supabase
      .from("signatures")
      .select("signed_document_url, document_url, created_at")
      .eq("document_url", originalDocumentUrl)
      .order("created_at", { ascending: false })
      .limit(5)
    let signedRows = signedRowsInitial

    if (signedErr) {
      return NextResponse.json({ error: "Lecture des signatures Supabase impossible." }, { status: 502 })
    }

    // Fallback compatibilité : historique potentiellement non strict sur `document_url`.
    if (!signedRows?.length) {
      const { data: fallbackRows, error: fallbackErr } = await supabase
        .from("signatures")
        .select("signed_document_url, document_url, created_at")
        .order("created_at", { ascending: false })
        .limit(400)
      if (fallbackErr) {
        return NextResponse.json({ error: "Lecture des signatures Supabase impossible." }, { status: 502 })
      }
      signedRows =
        fallbackRows?.filter((row) => {
          const docUrl = typeof row.document_url === "string" ? row.document_url : ""
          if (!docUrl) return false
          const extracted = extractBucketPathFromUrl(docUrl, ESIGN_BUCKET_ORIGINALS)
          if (extracted && extracted === normalizedOriginalPath) return true
          return (
            docUrl.includes(`/${ESIGN_BUCKET_ORIGINALS}/${normalizedOriginalPath}`) ||
            docUrl.includes(`/${ESIGN_BUCKET_ORIGINALS}/${encodedOriginalPath}`)
          )
        }) ?? []
    }

    const signedUrl = signedRows?.[0]?.signed_document_url as string | undefined
    if (!signedUrl || typeof signedUrl !== "string") {
      return NextResponse.json(
        { error: "Aucune signature finalisée trouvée. Le client n'a probablement pas signé." },
        { status: 409 }
      )
    }

    const signedKey = extractSignedKey(signedUrl)
    if (!signedKey) {
      return NextResponse.json(
        { error: "URL de document signé invalide (bucket signé introuvable)." },
        { status: 422 }
      )
    }

    await applyPendingFinalize(pending, { signedQuoteStorageKey: signedKey.trim() })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "pending_signature_repaired",
      targetType: "pending_signature",
      targetId: signatureRequestId,
      details: { userId: pending.userId, signedQuoteStorageKey: signedKey.trim() },
    })

    return NextResponse.json({ ok: true, repaired: true })
  } catch (error) {
    console.error("[gestion/signatures/repair]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Réparation impossible" },
      { status: 500 }
    )
  }
}
