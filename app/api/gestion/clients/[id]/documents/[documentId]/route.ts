import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { createSupabaseBrowserClient, createSupabaseServiceClient } from "@/lib/supabase"
import {
  GED_SUPABASE_BUCKET,
  getLocalGedPathCandidates,
  resolveGedFileReadTarget,
  sanitizeFilenameBase,
} from "@/lib/user-documents"
import { UPLOAD_DOC_TYPES } from "@/lib/user-document-types"

type DownloadCandidate = { bucket: string; path: string }

type LegacyLookupContext = {
  userId: string
  type: string
  filepath: string
  filename: string
  createdAt: string
  docId?: string
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w]+/g, "")
    .toLowerCase()
}

function dedupeCandidates(list: DownloadCandidate[]): DownloadCandidate[] {
  const seen = new Set<string>()
  const out: DownloadCandidate[] = []
  for (const item of list) {
    const key = `${item.bucket}:${item.path}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

async function listFolderFilePaths(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient> | ReturnType<typeof createSupabaseBrowserClient>>,
  bucket: string,
  folder: string
): Promise<{ path: string; updatedAt: number }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 200,
    sortBy: { column: "name", order: "desc" },
  })
  if (error || !data) return []
  return data
    .filter((entry) => Boolean((entry as { id?: string | null }).id))
    .map((entry) => {
      const name = (entry as { name?: string }).name ?? ""
      const updatedAtRaw = (entry as { updated_at?: string | null }).updated_at
      return {
        path: `${folder}/${name}`.replace(/\/+/g, "/").replace(/^\/+/, ""),
        updatedAt: updatedAtRaw ? Date.parse(updatedAtRaw) || 0 : 0,
      }
    })
}

async function listCandidateBuckets(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient> | ReturnType<typeof createSupabaseBrowserClient>>,
  seeds: string[]
): Promise<string[]> {
  const out = new Set<string>(seeds.filter(Boolean))
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (!error && data) {
      for (const bucket of data) {
        if (bucket?.name) out.add(bucket.name)
      }
    }
  } catch {
    // best effort
  }
  return [...out]
}

async function discoverLegacyGedCandidates(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient> | ReturnType<typeof createSupabaseBrowserClient>>,
  bucket: string,
  context: LegacyLookupContext
): Promise<DownloadCandidate[]> {
  const folders = [`ged/${context.userId}/${context.type}`, `ged/${context.userId}`]
  const { data: userSubfolders } = await supabase.storage.from(bucket).list(`ged/${context.userId}`, { limit: 200 })
  if (userSubfolders) {
    for (const entry of userSubfolders) {
      if (!entry.name || entry.name === context.type) continue
      if (Boolean((entry as { id?: string | null }).id)) continue
      folders.push(`ged/${context.userId}/${entry.name}`)
    }
  }

  const filepathLeaf = context.filepath.split("/").pop() || context.filepath
  const legacyMatch = filepathLeaf.match(/_(\d{10,})\.[a-z0-9]+$/i)
  const legacyTimestamp = legacyMatch?.[1] ?? null
  const safeBase = sanitizeFilenameBase(context.filename).toLowerCase()
  const safeBaseToken = normalizeToken(safeBase)
  const filenameToken = normalizeToken(context.filename)
  const filepathLeafToken = normalizeToken(filepathLeaf)
  const docIdToken = context.docId ? normalizeToken(context.docId) : ""
  const ext = (context.filename.split(".").pop() || "").toLowerCase()
  const createdAtMs = Date.parse(context.createdAt) || 0

  const scored: Array<{ candidate: DownloadCandidate; score: number; updatedAt: number }> = []
  const seen = new Set<string>()
  const scoreForPath = (filePath: string, updatedAt: number): number => {
    const name = filePath.split("/").pop()?.toLowerCase() ?? ""
    const nameToken = normalizeToken(name)
    let score = 0
    if (legacyTimestamp && name.startsWith(`${legacyTimestamp}_`)) score += 100
    if (safeBase && name.includes(`_${safeBase}.`)) score += 60
    if (ext && name.endsWith(`.${ext}`)) score += 20
    if (name === context.filename.toLowerCase()) score += 40
    if (safeBaseToken && nameToken.includes(safeBaseToken)) score += 55
    if (filenameToken && nameToken.includes(filenameToken)) score += 45
    if (filepathLeafToken && nameToken.includes(filepathLeafToken)) score += 35
    if (docIdToken && nameToken.includes(docIdToken)) score += 90
    if (createdAtMs > 0 && updatedAt > 0 && Math.abs(updatedAt - createdAtMs) < 1000 * 60 * 60 * 24 * 3) {
      score += 25
    }
    if (filePath.includes(context.userId)) score += 15
    if (filePath.includes(`/${context.type}/`)) score += 10
    return score
  }

  for (const folder of folders) {
    const files = await listFolderFilePaths(supabase, bucket, folder)
    for (const file of files) {
      const key = `${bucket}:${file.path}`
      if (seen.has(key)) continue
      seen.add(key)
      const score = scoreForPath(file.path, file.updatedAt)
      const finalScore = score > 0 ? score : 1
      scored.push({
        candidate: { bucket, path: file.path },
        score: finalScore,
        updatedAt: file.updatedAt,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt)
  const ranked = scored.slice(0, 30).map((entry) => entry.candidate)
  if (ranked.length > 0) return ranked

  // Scan récursif de buckets legacy quand la structure du dossier est atypique.
  type QueueItem = { folder: string; depth: number }
  const queue: QueueItem[] = [{ folder: "", depth: 0 }]
  const visitedFolders = new Set<string>([""])
  const deepMatches: Array<{ candidate: DownloadCandidate; score: number; updatedAt: number }> = []
  let scannedFiles = 0
  const MAX_DEPTH = 3
  const MAX_FOLDERS = 180
  const MAX_FILES = 2500

  while (queue.length > 0 && visitedFolders.size <= MAX_FOLDERS && scannedFiles < MAX_FILES) {
    const current = queue.shift()!
    const { data, error } = await supabase.storage.from(bucket).list(current.folder, {
      limit: 200,
      sortBy: { column: "name", order: "desc" },
    })
    if (error || !data) continue
    for (const entry of data) {
      const name = (entry as { name?: string }).name ?? ""
      if (!name) continue
      const fullPath = current.folder ? `${current.folder}/${name}` : name
      if (Boolean((entry as { id?: string | null }).id)) {
        scannedFiles++
        const updatedAtRaw = (entry as { updated_at?: string | null }).updated_at
        const updatedAt = updatedAtRaw ? Date.parse(updatedAtRaw) || 0 : 0
        const score = scoreForPath(fullPath, updatedAt)
        if (score > 0) {
          deepMatches.push({ candidate: { bucket, path: fullPath }, score, updatedAt })
        }
      } else if (current.depth < MAX_DEPTH) {
        if (!visitedFolders.has(fullPath)) {
          visitedFolders.add(fullPath)
          queue.push({ folder: fullPath, depth: current.depth + 1 })
        }
      }
    }
  }

  deepMatches.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt)
  return deepMatches.slice(0, 40).map((x) => x.candidate)
}

async function downloadFromSupabaseWithFallback(
  candidates: DownloadCandidate[],
  context: LegacyLookupContext
): Promise<Uint8Array | null> {
  const supabase = createSupabaseServiceClient() ?? createSupabaseBrowserClient()
  if (!supabase) return null

  const initialBucketSeeds = [
    GED_SUPABASE_BUCKET,
    "client_documents",
    "client-documents",
    "ged",
    "user_documents",
    "user-documents",
    "documents",
    "uploads",
    ...candidates.map((c) => c.bucket),
  ]

  const attempt = async (candidate: DownloadCandidate) => {
    const { data, error } = await supabase.storage.from(candidate.bucket).download(candidate.path)
    if (!error && data) {
      return new Uint8Array(await data.arrayBuffer())
    }
    const { data: signed, error: signError } = await supabase.storage
      .from(candidate.bucket)
      .createSignedUrl(candidate.path, 60)
    if (signError || !signed?.signedUrl) return null
    const fetched = await fetch(signed.signedUrl, { cache: "no-store" }).catch(() => null)
    if (!fetched || !fetched.ok) return null
    return new Uint8Array(await fetched.arrayBuffer())
  }

  const byBucket = await listCandidateBuckets(supabase, initialBucketSeeds)

  const filepathPath = context.filepath.replace(/^\/+/, "")
  const defaultPathCandidates = filepathPath
    ? byBucket.map((bucket) => ({
        bucket,
        path: filepathPath,
      }))
    : []

  const initialCandidates = dedupeCandidates([...candidates, ...defaultPathCandidates])
  for (const candidate of initialCandidates) {
    const downloaded = await attempt(candidate)
    if (downloaded) return downloaded
  }

  for (const bucket of byBucket) {
    const discovered = await discoverLegacyGedCandidates(supabase, bucket, context)
    for (const candidate of dedupeCandidates(discovered)) {
      const downloaded = await attempt(candidate)
      if (downloaded) return downloaded
    }
  }

  return null
}

/**
 * Télécharge/ouvre un document GED client depuis la fiche gestion (admin uniquement).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id: userId, documentId } = await params
    if (!userId || !documentId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    const doc = await prisma.userDocument.findFirst({
      where: {
        id: documentId,
        userId,
        type: { in: [...UPLOAD_DOC_TYPES] },
      },
      select: { id: true, type: true, filename: true, filepath: true, mimeType: true, createdAt: true },
    })

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const resolved = resolveGedFileReadTarget(doc.filepath)

    let fileBytes: Uint8Array
    if (resolved.kind === "supabase") {
      const fromSupabase = await downloadFromSupabaseWithFallback(resolved.candidates, {
        userId,
        type: doc.type,
        filepath: doc.filepath,
        filename: doc.filename,
        createdAt: doc.createdAt.toISOString(),
        docId: doc.id,
      })
      if (!fromSupabase) {
        // Dernier fallback: anciens fichiers en stockage local.
        const localCandidates = getLocalGedPathCandidates(doc.filepath)
        const localPath = localCandidates.find((candidate) => existsSync(candidate))
        if (!localPath) {
          return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
        }
        const buffer = await readFile(localPath)
        fileBytes = new Uint8Array(buffer)
      } else {
        fileBytes = fromSupabase
      }
    } else {
      if (!existsSync(resolved.path)) {
        return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
      }
      const buffer = await readFile(resolved.path)
      fileBytes = new Uint8Array(buffer)
    }

    return new NextResponse(Buffer.from(fileBytes), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      },
    })
  } catch (error) {
    console.error("[gestion/clients/:id/documents/:documentId] GET", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
