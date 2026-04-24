import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { getServerSession } from "next-auth"
import { existsSync } from "fs"
import { readFile } from "fs/promises"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { createSupabaseBrowserClient, createSupabaseServiceClient } from "@/lib/supabase"
import { SITE_URL } from "@/lib/site-url"
import {
  GED_SUPABASE_BUCKET,
  getLocalGedPathCandidates,
  resolveGedFileReadTarget,
  sanitizeFilenameBase,
} from "@/lib/user-documents"

const DEFAULT_TO = "contact@optimum-assurance.fr"
const MAX_ZIP_SIZE_BYTES = 18 * 1024 * 1024
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const maxDuration = 60

type DownloadCandidate = { bucket: string; path: string }

type LegacyLookupContext = {
  userId: string
  type: string
  filepath: string
  filename: string
  createdAt: string
  docId?: string
}

function normalizeToken(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[^\w]+/g, "")
    .toLowerCase()
}

function safeZipFilename(name: string): string {
  const clean = name.replace(/[\\/]+/g, "_").trim()
  return clean || "document"
}

function extFromName(name: string): string {
  const dot = name.lastIndexOf(".")
  if (dot <= 0 || dot === name.length - 1) return ""
  return name.slice(dot + 1).toLowerCase()
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
  const ext = extFromName(context.filename)
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
      if (score > 0) {
        scored.push({
          candidate: { bucket, path: file.path },
          score,
          updatedAt: file.updatedAt,
        })
      }
    }
  }

  scored.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt)
  const ranked = scored.slice(0, 30).map((entry) => entry.candidate)
  if (ranked.length > 0) return ranked

  const fallback: Array<{ candidate: DownloadCandidate; updatedAt: number }> = []
  for (const folder of folders) {
    const files = await listFolderFilePaths(supabase, bucket, folder)
    const sorted = [...files].sort((a, b) => b.updatedAt - a.updatedAt)
    const latest = sorted[0]
    if (latest) fallback.push({ candidate: { bucket, path: latest.path }, updatedAt: latest.updatedAt })
  }
  if (fallback.length > 0) {
    return fallback.sort((a, b) => b.updatedAt - a.updatedAt).map((x) => x.candidate)
  }

  // Scan large legacy buckets recursively (depth limité) si structure de dossier atypique.
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

async function downloadDocBytes(
  doc: { filepath: string; filename: string; type: string; createdAt: Date },
  userId: string
): Promise<Uint8Array | null> {
  const resolved = resolveGedFileReadTarget(doc.filepath)
  if (resolved.kind === "local") {
    if (!existsSync(resolved.path)) return null
    const buffer = await readFile(resolved.path)
    return new Uint8Array(buffer)
  }

  const supabase = createSupabaseServiceClient() ?? createSupabaseBrowserClient()
  if (!supabase) return null

  const attempt = async (candidate: DownloadCandidate) => {
    const { data, error } = await supabase.storage.from(candidate.bucket).download(candidate.path)
    if (!error && data) {
      return new Uint8Array(await data.arrayBuffer())
    }
    // Fallback: URL signée puis fetch direct (utile sur certains objets legacy / ACL)
    const { data: signed, error: signError } = await supabase.storage
      .from(candidate.bucket)
      .createSignedUrl(candidate.path, 60)
    if (signError || !signed?.signedUrl) return null
    const fetched = await fetch(signed.signedUrl, { cache: "no-store" }).catch(() => null)
    if (!fetched || !fetched.ok) return null
    return new Uint8Array(await fetched.arrayBuffer())
  }

  for (const candidate of resolved.candidates) {
    const out = await attempt(candidate)
    if (out) return out
  }

  const byBucket = await listCandidateBuckets(supabase, [
    GED_SUPABASE_BUCKET,
    "client_documents",
    "client-documents",
    "ged",
    "user_documents",
    "user-documents",
    "documents",
    "uploads",
    ...resolved.candidates.map((c) => c.bucket),
  ])
  for (const bucket of byBucket) {
    const discovered = await discoverLegacyGedCandidates(supabase, bucket, {
      userId,
      type: doc.type,
      filepath: doc.filepath,
      filename: doc.filename,
      createdAt: doc.createdAt.toISOString(),
    })
    for (const candidate of discovered) {
      const out = await attempt(candidate)
      if (out) return out
    }
  }

  for (const candidate of getLocalGedPathCandidates(doc.filepath)) {
    if (!existsSync(candidate)) continue
    const buffer = await readFile(candidate)
    return new Uint8Array(buffer)
  }

  return null
}

async function buildDocAccessLink(
  doc: { id: string; filepath: string; filename: string; type: string; createdAt: Date },
  userId: string
): Promise<string> {
  const raw = doc.filepath.trim()
  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  const supabase = createSupabaseServiceClient() ?? createSupabaseBrowserClient()
  if (supabase) {
    const resolved = resolveGedFileReadTarget(doc.filepath)
    if (resolved.kind === "supabase") {
      const trySign = async (candidate: DownloadCandidate) => {
        const { data, error } = await supabase.storage
          .from(candidate.bucket)
          .createSignedUrl(candidate.path, 60 * 60 * 24 * 3)
        if (error || !data?.signedUrl) return null
        return data.signedUrl
      }

      for (const candidate of resolved.candidates) {
        const signed = await trySign(candidate)
        if (signed) return signed
      }

      const byBucket = new Set<string>([
        GED_SUPABASE_BUCKET,
        "client_documents",
        ...resolved.candidates.map((c) => c.bucket),
      ])
      for (const bucket of byBucket) {
        const discovered = await discoverLegacyGedCandidates(supabase, bucket, {
          userId,
          type: doc.type,
          filepath: doc.filepath,
          filename: doc.filename,
          createdAt: doc.createdAt.toISOString(),
        })
        for (const candidate of discovered) {
          const signed = await trySign(candidate)
          if (signed) return signed
        }
      }
    }
  }

  const appUrl = SITE_URL.replace(/\/+$/, "")
  return `${appUrl}/api/gestion/clients/${userId}/documents/${doc.id}`
}

function buildZipEntryPath(
  used: Set<string>,
  doc: { type: string; filename: string; id: string },
  fallbackExt: string
): string {
  const original = safeZipFilename(doc.filename)
  const dot = original.lastIndexOf(".")
  const base = dot > 0 ? original.slice(0, dot) : original
  const ext = dot > 0 ? original.slice(dot + 1) : fallbackExt
  let idx = 0
  while (true) {
    const name = idx === 0 ? `${base}.${ext}` : `${base}_${idx + 1}.${ext}`
    const candidate = `${doc.type}/${name}`
    if (!used.has(candidate.toLowerCase())) {
      used.add(candidate.toLowerCase())
      return candidate
    }
    idx++
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id: userId } = await params
    if (!userId) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 400 })
    }

    let to = DEFAULT_TO
    try {
      const body = (await request.json()) as { to?: string }
      if (typeof body?.to === "string" && body.to.trim()) {
        to = body.to.trim().toLowerCase()
      }
    } catch {
      // body facultatif
    }
    if (!EMAIL_RE.test(to)) {
      return NextResponse.json({ error: "Email destinataire invalide" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, raisonSociale: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const docs = await prisma.userDocument.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        filename: true,
        filepath: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    })
    if (docs.length === 0) {
      return NextResponse.json({ error: "Aucun document GED à exporter" }, { status: 400 })
    }

    const zip = new JSZip()
    const usedPaths = new Set<string>()
    const missingDocs: Array<{ id: string; type: string; filename: string; createdAt: Date }> = []
    let includedCount = 0

    for (const doc of docs) {
      const bytes = await downloadDocBytes(doc, userId)
      if (!bytes) {
        missingDocs.push({
          id: doc.id,
          type: doc.type,
          filename: doc.filename,
          createdAt: doc.createdAt,
        })
        continue
      }
      const fallbackExt =
        doc.mimeType === "application/pdf"
          ? "pdf"
          : doc.mimeType === "image/png"
            ? "png"
            : doc.mimeType === "image/webp"
              ? "webp"
              : "jpg"
      const path = buildZipEntryPath(usedPaths, doc, fallbackExt)
      zip.file(path, bytes)
      includedCount++
    }

    if (missingDocs.length > 0) {
      const openLinks = await Promise.all(
        missingDocs.map(async (doc) => ({
          ...doc,
          url: await buildDocAccessLink(
            {
              id: doc.id,
              filepath: docs.find((d) => d.id === doc.id)?.filepath || "",
              filename: doc.filename,
              type: doc.type,
              createdAt: doc.createdAt,
            },
            userId
          ),
        }))
      )
      zip.file(
        "_FICHIERS_MANQUANTS.txt",
        `Documents non récupérés (${missingDocs.length}) :\n${missingDocs
          .map((m) => `- ${m.type} - ${m.filename}`)
          .join("\n")}\n`
      )
      zip.file(
        "_LIENS_OUVERTURE_GED.txt",
        `Liens d'ouverture de secours :\n${openLinks
          .map((doc) => `- ${doc.type} - ${doc.filename}\n  ${doc.url}`)
          .join("\n")}\n`
      )
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    if (zipBuffer.length > MAX_ZIP_SIZE_BYTES) {
      return NextResponse.json(
        {
          error:
            "Archive trop volumineuse pour email automatique. Réduisez le lot ou utilisez l'export manuel.",
        },
        { status: 413 }
      )
    }

    const dateTag = new Date().toISOString().slice(0, 10)
    const clientLabel = sanitizeFilenameBase(user.raisonSociale || user.email || user.id)
    const zipName = `ged-${clientLabel}-${dateTag}.zip`
    const subject = `${includedCount > 0 ? "URGENT" : "URGENT (secours)"} - ZIP GED ${user.raisonSociale || user.email}`
    const text = [
      `Bonjour,`,
      ``,
      `Veuillez trouver en pièce jointe l'archive ZIP des documents GED du client ${
        user.raisonSociale || user.email
      }.`,
      ``,
      `Documents inclus : ${includedCount}`,
      `Documents manquants : ${missingDocs.length}`,
      ``,
      includedCount === 0
        ? `Aucun binaire n'a pu être joint automatiquement : utilisez les liens de secours dans le ZIP (_LIENS_OUVERTURE_GED.txt).`
        : `Envoyé automatiquement depuis l'espace gestion Optimum Assurance.`,
    ].join("\n")

    const sent = await sendEmail({
      to,
      subject,
      text,
      attachments: [{ filename: zipName, content: zipBuffer }],
      replyTo: session.user.email || undefined,
      skipBranding: true,
    })
    if (!sent) {
      return NextResponse.json(
        { error: "Envoi email impossible (Resend indisponible ou rejet pièce jointe)." },
        { status: 503 }
      )
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "ged_zip_sent",
      targetType: "User",
      targetId: userId,
      details: {
        to,
        includedCount,
        missingCount: missingDocs.length,
        zipName,
      },
    })

    return NextResponse.json({
      ok: true,
      sentTo: to,
      includedCount,
      missingCount: missingDocs.length,
      zipName,
    })
  } catch (error) {
    console.error("[gestion/clients/:id/documents/export-zip-email] POST", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi ZIP GED" },
      { status: 500 }
    )
  }
}
