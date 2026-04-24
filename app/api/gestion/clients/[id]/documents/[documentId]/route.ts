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

type DownloadCandidate = { bucket: string; path: string }

type LegacyLookupContext = {
  userId: string
  type: string
  filepath: string
  filename: string
  createdAt: string
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
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
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

async function discoverLegacyGedCandidates(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
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
  const ext = (context.filename.split(".").pop() || "").toLowerCase()
  const createdAtMs = Date.parse(context.createdAt) || 0

  const scored: Array<{ candidate: DownloadCandidate; score: number; updatedAt: number }> = []
  const seen = new Set<string>()

  for (const folder of folders) {
    const files = await listFolderFilePaths(supabase, bucket, folder)
    for (const file of files) {
      const key = `${bucket}:${file.path}`
      if (seen.has(key)) continue
      seen.add(key)
      const name = file.path.split("/").pop()?.toLowerCase() ?? ""
      const nameToken = normalizeToken(name)
      let score = 0
      if (legacyTimestamp && name.startsWith(`${legacyTimestamp}_`)) score += 100
      if (safeBase && name.includes(`_${safeBase}.`)) score += 60
      if (ext && name.endsWith(`.${ext}`)) score += 20
      if (name === context.filename.toLowerCase()) score += 40
      if (safeBaseToken && nameToken.includes(safeBaseToken)) score += 55
      if (filenameToken && nameToken.includes(filenameToken)) score += 45
      if (filepathLeafToken && nameToken.includes(filepathLeafToken)) score += 35
      if (createdAtMs > 0 && file.updatedAt > 0 && Math.abs(file.updatedAt - createdAtMs) < 1000 * 60 * 60 * 24 * 3) {
        score += 25
      }
      const finalScore = score > 0 ? score : 1
      scored.push({
        candidate: { bucket, path: file.path },
        score: finalScore,
        updatedAt: file.updatedAt,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt)
  return scored.slice(0, 30).map((entry) => entry.candidate)
}

async function downloadFromSupabaseWithFallback(
  candidates: DownloadCandidate[],
  context: LegacyLookupContext
): Promise<Uint8Array | null> {
  const supabase = createSupabaseServiceClient() ?? createSupabaseBrowserClient()
  if (!supabase) return null

  const byBucket = new Set<string>([
    GED_SUPABASE_BUCKET,
    "client_documents",
    "client-documents",
    "documents",
    ...candidates.map((c) => c.bucket),
  ])

  const attempt = async (candidate: DownloadCandidate) => {
    const { data, error } = await supabase.storage.from(candidate.bucket).download(candidate.path)
    if (!error && data) return new Uint8Array(await data.arrayBuffer())
    return null
  }

  const initialCandidates = dedupeCandidates([
    ...candidates,
    ...[...byBucket].map((bucket) => ({
      bucket,
      path: context.filepath.replace(/^\/+/, ""),
    })),
  ])

  for (const candidate of initialCandidates) {
    const downloaded = await attempt(candidate)
    if (downloaded) return downloaded
  }

  for (const bucket of byBucket) {
    const discovered = await discoverLegacyGedCandidates(supabase, bucket, context)
    for (const candidate of discovered) {
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
      where: { id: documentId, userId },
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
