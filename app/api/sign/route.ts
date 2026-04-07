import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { applySignatureToPdf } from "@/lib/esign/apply-signature-to-pdf"
import { ESIGN_BUCKET_ORIGINALS, ESIGN_BUCKET_SIGNED } from "@/lib/esign/buckets"
import { getClientIp, getUserAgent } from "@/lib/esign/get-request-meta"
import { sha256Hex } from "@/lib/esign/hash-pdf"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { applyPendingFinalize } from "@/lib/pending-signature-finalize"

export const runtime = "nodejs"

/** Lien de téléchargement immédiat (buckets privés). */
const SIGNED_DOWNLOAD_TTL_SEC = 60 * 60 * 24 * 7

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_SIGNATURE_IMAGE_BYTES = 2 * 1024 * 1024
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function isValidPngDataUrl(s: string): boolean {
  if (!s.startsWith("data:image/png;base64,")) return false
  const b64 = s.slice("data:image/png;base64,".length).trim()
  if (b64.length < 80) return false
  if (b64.length > MAX_SIGNATURE_IMAGE_BYTES * 4) return false
  try {
    const buf = Buffer.from(b64, "base64")
    if (buf.length < 32 || buf.length > MAX_SIGNATURE_IMAGE_BYTES) return false
    return buf.subarray(0, 8).equals(PNG_SIGNATURE)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Objet JSON attendu." }, { status: 400 })
  }

  const { documentId, signature, email, agreed } = body as Record<string, unknown>

  if (agreed !== true) {
    return NextResponse.json({ error: "Vous devez accepter de signer le document." }, { status: 400 })
  }

  if (typeof documentId !== "string" || !UUID_RE.test(documentId.trim())) {
    return NextResponse.json({ error: "Identifiant de document invalide." }, { status: 400 })
  }

  if (typeof email !== "string" || email.trim().length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 })
  }

  if (typeof signature !== "string" || !isValidPngDataUrl(signature)) {
    return NextResponse.json({ error: "Signature vide ou image invalide." }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: "Configuration Supabase incomplète (clé service)." }, { status: 500 })
  }

  const id = documentId.trim()
  const emailNorm = email.trim().toLowerCase()

  const { data: signRequest, error: reqError } = await supabase
    .from("sign_requests")
    .select("id, document_storage_path")
    .eq("id", id)
    .maybeSingle()

  if (reqError) {
    return NextResponse.json({ error: "Impossible de charger la demande de signature." }, { status: 500 })
  }
  if (!signRequest?.document_storage_path) {
    return NextResponse.json({ error: "Demande de signature introuvable." }, { status: 404 })
  }

  const pending = await prisma.pendingSignature.findUnique({
    where: { signatureRequestId: id },
  })

  const { data: downloaded, error: dlError } = await supabase.storage
    .from(ESIGN_BUCKET_ORIGINALS)
    .download(signRequest.document_storage_path)

  if (dlError || !downloaded) {
    return NextResponse.json(
      { error: "Téléchargement du PDF original impossible (bucket ou chemin)." },
      { status: 502 }
    )
  }

  const originalBytes = new Uint8Array(await downloaded.arrayBuffer())
  const signedAtIso = new Date().toISOString()

  let signedBytes: Uint8Array
  try {
    signedBytes = await applySignatureToPdf(originalBytes, signature, emailNorm, signedAtIso)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Traitement PDF impossible."
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const documentHash = sha256Hex(signedBytes)
  const objectName = `${randomUUID()}.pdf`

  const { error: upError } = await supabase.storage.from(ESIGN_BUCKET_SIGNED).upload(objectName, signedBytes, {
    contentType: "application/pdf",
    upsert: false,
  })

  if (upError) {
    return NextResponse.json({ error: "Échec de l’envoi du PDF signé vers le stockage." }, { status: 502 })
  }

  const { data: origPublic } = supabase.storage
    .from(ESIGN_BUCKET_ORIGINALS)
    .getPublicUrl(signRequest.document_storage_path)

  const { data: signedPublic } = supabase.storage.from(ESIGN_BUCKET_SIGNED).getPublicUrl(objectName)

  const documentUrl = origPublic.publicUrl
  const signedDocumentReferenceUrl = signedPublic.publicUrl

  const { data: signedLink, error: signUrlError } = await supabase.storage
    .from(ESIGN_BUCKET_SIGNED)
    .createSignedUrl(objectName, SIGNED_DOWNLOAD_TTL_SEC)

  const signedDocumentUrl =
    !signUrlError && signedLink?.signedUrl ? signedLink.signedUrl : signedDocumentReferenceUrl

  const { data: row, error: insError } = await supabase
    .from("signatures")
    .insert({
      document_url: documentUrl,
      signed_document_url: signedDocumentReferenceUrl,
      email: emailNorm,
      ip: getClientIp(request),
      user_agent: getUserAgent(request),
      document_hash: documentHash,
    })
    .select("id, signed_document_url")
    .single()

  if (insError || !row) {
    return NextResponse.json({ error: "Enregistrement de la piste d’audit impossible." }, { status: 500 })
  }

  if (pending) {
    try {
      const raw = JSON.parse(pending.contractData || "{}") as Record<string, unknown>
      const isCustomPdf = raw.customUploadedDevisFlow === true
      await applyPendingFinalize(
        pending,
        isCustomPdf ? { signedQuoteStorageKey: objectName } : undefined
      )
    } catch (e) {
      console.error("[api/sign] applyPendingFinalize", e)
      return NextResponse.json(
        {
          error:
            "Signature enregistrée mais la finalisation du contrat a échoué. Contactez le support avec votre e-mail.",
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    signedDocumentUrl,
    signatureId: row.id,
    documentHash,
  })
}
