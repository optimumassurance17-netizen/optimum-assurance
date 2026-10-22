import { existsSync } from "fs"
import { readFile } from "fs/promises"
import { NextResponse } from "next/server"
import { createSupabaseBrowserClient, createSupabaseServiceClient } from "@/lib/supabase"
import {
  canProxyGedBytes,
  gedInlineContentDisposition,
  isSafeGedRedirectUrl,
} from "@/lib/ged-policy"
import { uploadGedObject } from "@/lib/ged-save"
import { prisma } from "@/lib/prisma"
import {
  GED_SUPABASE_BUCKET,
  buildGedStoragePath,
  getLocalGedPathCandidates,
  resolveGedFileReadTarget,
  sanitizeFilenameBase,
} from "@/lib/user-documents"

type GedOpenDoc = {
  id: string
  userId: string
  type: string
  filename: string
  filepath: string
  mimeType: string | null
}

type StorageClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>

function fileResponse(bytes: Uint8Array, mimeType: string, filename: string) {
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": mimeType || "application/octet-stream",
      "Content-Disposition": gedInlineContentDisposition(filename),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

function missingResponse() {
  return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
}

function unavailableResponse() {
  return NextResponse.json({ error: "Stockage GED indisponible" }, { status: 503 })
}

function tooLargeResponse() {
  return NextResponse.json(
    {
      error:
        "Ce document est trop volumineux pour s'ouvrir depuis le site. Réessayez dans un instant, le temps que le stockage distant le reprenne.",
    },
    { status: 413 }
  )
}

async function probeSignedUrl(url: string): Promise<{ ok: boolean; size: number | null }> {
  try {
    const probe = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
      redirect: "follow",
    })
    const status = probe.status
    const contentType = probe.headers.get("content-type") || ""
    const total = Number(probe.headers.get("content-range")?.split("/").pop())
    const lengthHeader = Number(probe.headers.get("content-length"))
    await probe.body?.cancel().catch(() => undefined)
    if (contentType.includes("application/json") || contentType.includes("application/problem+json")) {
      return { ok: false, size: null }
    }
    const size = Number.isFinite(total) && total > 0
      ? total
      : status === 200 && Number.isFinite(lengthHeader) && lengthHeader > 0
        ? lengthHeader
        : null
    return { ok: status === 200 || status === 206, size }
  } catch {
    return { ok: false, size: null }
  }
}

async function signedUrlFor(supabase: StorageClient, bucket: string, objectPath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 10)
    if (error || !data?.signedUrl || !isSafeGedRedirectUrl(data.signedUrl)) return null
    return data.signedUrl
  } catch {
    return null
  }
}

async function openStoredObject(
  supabase: StorageClient,
  bucket: string,
  objectPath: string,
  doc: GedOpenDoc,
  mimeType: string
): Promise<NextResponse | null> {
  const signedUrl = await signedUrlFor(supabase, bucket, objectPath)
  const probe = signedUrl ? await probeSignedUrl(signedUrl) : { ok: false, size: null }
  if (signedUrl && probe.ok && probe.size != null && !canProxyGedBytes(probe.size)) {
    return NextResponse.redirect(signedUrl, 302)
  }
  const bytes = await downloadCandidateBytes(supabase, bucket, objectPath)
  if (bytes) {
    if (canProxyGedBytes(bytes.byteLength)) return fileResponse(bytes, mimeType, doc.filename)
    if (signedUrl) return NextResponse.redirect(signedUrl, 302)
    return (await rehostAndRedirect(doc, bytes)) ?? tooLargeResponse()
  }
  if (signedUrl && probe.ok) return NextResponse.redirect(signedUrl, 302)
  return null
}

async function downloadCandidateBytes(
  supabase: StorageClient,
  bucket: string,
  objectPath: string
): Promise<Uint8Array | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(objectPath)
    if (error || !data) return null
    const bytes = new Uint8Array(await data.arrayBuffer())
    return bytes.byteLength > 0 ? bytes : null
  } catch {
    return null
  }
}

async function rehostAndRedirect(doc: GedOpenDoc, bytes: Uint8Array): Promise<NextResponse | null> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) return null
  const extension = doc.filename.includes(".")
    ? doc.filename.split(".").pop()?.toLowerCase() || "pdf"
    : "pdf"
  const storagePath = buildGedStoragePath(
    doc.userId,
    doc.type,
    Date.now(),
    sanitizeFilenameBase(doc.filename),
    extension === "jpeg" ? "jpg" : extension
  )
  const uploaded = await uploadGedObject(Buffer.from(bytes), storagePath, doc.mimeType || "application/octet-stream")
  if (!uploaded) return null
  const signedUrl = await signedUrlFor(supabase, uploaded.bucket, uploaded.storagePath)
  if (!signedUrl || !(await probeSignedUrl(signedUrl)).ok) return null
  await prisma.userDocument
    .update({
      where: { id: doc.id },
      data: { filepath: `${uploaded.bucket}/${uploaded.storagePath}` },
    })
    .catch(() => undefined)
  return NextResponse.redirect(signedUrl, 302)
}

async function responseFromLocalFile(doc: GedOpenDoc, fullPath: string): Promise<NextResponse> {
  const bytes = new Uint8Array(await readFile(fullPath))
  if (canProxyGedBytes(bytes.byteLength)) {
    return fileResponse(bytes, doc.mimeType || "application/octet-stream", doc.filename)
  }
  const redirected = await rehostAndRedirect(doc, bytes)
  return redirected ?? tooLargeResponse()
}

export async function openGedDocument(doc: GedOpenDoc): Promise<NextResponse> {
  const resolved = resolveGedFileReadTarget(doc.filepath)
  const mimeType = doc.mimeType || "application/octet-stream"

  if (resolved.kind === "database") {
    if (resolved.bytes.length === 0) return missingResponse()
    if (canProxyGedBytes(resolved.bytes.length)) {
      return fileResponse(new Uint8Array(resolved.bytes), mimeType, doc.filename)
    }
    const redirected = await rehostAndRedirect(doc, new Uint8Array(resolved.bytes))
    return redirected ?? tooLargeResponse()
  }

  if (resolved.kind === "local") {
    if (!existsSync(resolved.path)) return missingResponse()
    return responseFromLocalFile(doc, resolved.path)
  }

  const supabase = createSupabaseServiceClient() ?? createSupabaseBrowserClient()
  if (!supabase) {
    const localFallback = getLocalGedPathCandidates(doc.filepath).find((candidate) => existsSync(candidate))
    if (!localFallback) return unavailableResponse()
    return responseFromLocalFile(doc, localFallback)
  }

  for (const candidate of resolved.candidates) {
    const opened = await openStoredObject(supabase, candidate.bucket, candidate.path, doc, mimeType)
    if (opened) return opened
  }

  const bucket = resolved.candidates[0]?.bucket || GED_SUPABASE_BUCKET
  const folder = `ged/${doc.userId}/${doc.type}`
  try {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: 50,
      sortBy: { column: "name", order: "desc" },
    })
    if (!error && data) {
      const wanted = sanitizeFilenameBase(doc.filename).toLowerCase()
      const match = data.find((entry) => {
        const name = entry.name?.toLowerCase() ?? ""
        return Boolean(entry.name) && (name.includes(`_${wanted}.`) || name === doc.filename.toLowerCase())
      })
      if (match?.name) {
        const opened = await openStoredObject(supabase, bucket, `${folder}/${match.name}`, doc, mimeType)
        if (opened) return opened
      }
    }
  } catch {
    // Le dossier standard n'existe pas pour les anciens rangements.
  }

  const localFallback = getLocalGedPathCandidates(doc.filepath).find((candidate) => existsSync(candidate))
  if (localFallback) return responseFromLocalFile(doc, localFallback)
  return missingResponse()
}
