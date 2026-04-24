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
  const ext = extFromName(context.filename)
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

  const fallback: DownloadCandidate[] = []
  for (const folder of folders) {
    const files = await listFolderFilePaths(supabase, bucket, folder)
    const sorted = [...files].sort((a, b) => b.updatedAt - a.updatedAt)
    const latest = sorted[0]
    if (latest) fallback.push({ bucket, path: latest.path })
  }
  return fallback
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
    if (error || !data) return null
    return new Uint8Array(await data.arrayBuffer())
  }

  for (const candidate of resolved.candidates) {
    const out = await attempt(candidate)
    if (out) return out
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
    const missing: string[] = []
    let includedCount = 0

    for (const doc of docs) {
      const bytes = await downloadDocBytes(doc, userId)
      if (!bytes) {
        missing.push(`${doc.type} - ${doc.filename}`)
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

    const appUrl = SITE_URL.replace(/\/+$/, "")
    if (missing.length > 0) {
      const openLinks = docs.map((doc) => `${appUrl}/api/gestion/clients/${userId}/documents/${doc.id}`)
      zip.file(
        "_FICHIERS_MANQUANTS.txt",
        `Documents non récupérés (${missing.length}) :\n${missing.map((m) => `- ${m}`).join("\n")}\n`
      )
      zip.file(
        "_LIENS_OUVERTURE_GED.txt",
        `Liens d'ouverture (admin connecté requis) :\n${openLinks.map((l) => `- ${l}`).join("\n")}\n`
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
      `Documents manquants : ${missing.length}`,
      ``,
      includedCount === 0
        ? `Aucun binaire n'a pu être joint automatiquement : voir les liens d'ouverture dans le ZIP (_LIENS_OUVERTURE_GED.txt).`
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
        missingCount: missing.length,
        zipName,
      },
    })

    return NextResponse.json({
      ok: true,
      sentTo: to,
      includedCount,
      missingCount: missing.length,
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
