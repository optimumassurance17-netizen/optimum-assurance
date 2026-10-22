import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { writeFile } from "fs/promises"
import { join } from "path"
import { authOptions } from "@/lib/auth"
import { finalizeGedDirectUpload, peekGedUploadReceipt, prepareGedDirectUpload } from "@/lib/ged-direct-upload"
import { persistGedFileRecord, uploadGedObject } from "@/lib/ged-save"
import {
  UPLOAD_DIR,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  GED_DATABASE_FILE_PREFIX,
  buildGedStoragePath,
  detectUploadMimeAndExt,
  encodeGedDatabaseFile,
  ensureUploadDir,
  sanitizeFilenameBase,
} from "@/lib/user-documents"

export const runtime = "nodejs"

function isSchemaDriftError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
  )
}

function allowLocalGedFallback(): boolean {
  if (process.env.GED_ALLOW_LOCAL_FALLBACK === "1") return true
  const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase()
  if (vercelEnv === "production" || vercelEnv === "preview") return false
  return process.env.NODE_ENV !== "production"
}

function jsonError(error: unknown) {
  if (isSchemaDriftError(error)) {
    console.error("GED upload indisponible (schéma non aligné):", error)
    return NextResponse.json(
      { error: "GED temporairement indisponible: migration base requise" },
      { status: 503 }
    )
  }
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes(GED_DATABASE_FILE_PREFIX) || message.length > 500) {
    console.error("Erreur upload document (détail omis pour ne pas journaliser le fichier)")
  } else {
    console.error("Erreur upload document:", error)
  }
  return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    const userId = session.user.id
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as {
        prepare?: unknown
        confirm?: unknown
        receipt?: unknown
        type?: unknown
        filename?: unknown
        mimeType?: unknown
        size?: unknown
      } | null
      if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })

      if (body.confirm === true) {
        if (typeof body.receipt !== "string") {
          return NextResponse.json({ error: "Dépôt incomplet." }, { status: 400 })
        }
        const peeked = peekGedUploadReceipt(body.receipt)
        if (!peeked || !ALLOWED_TYPES.includes(peeked.type as (typeof ALLOWED_TYPES)[number])) {
          return NextResponse.json({ error: "Type de document invalide" }, { status: 400 })
        }
        const stored = await finalizeGedDirectUpload(userId, body.receipt)
        if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: stored.status })
        return NextResponse.json({
          id: stored.doc.id,
          type: stored.doc.type,
          filename: stored.doc.filename,
          createdAt: stored.doc.createdAt,
        })
      }

      if (body.prepare === true) {
        const type = typeof body.type === "string" ? body.type : ""
        if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
          return NextResponse.json({ error: "Type de document invalide" }, { status: 400 })
        }
        const prepared = await prepareGedDirectUpload({
          userId,
          type,
          filename: typeof body.filename === "string" ? body.filename : "",
          mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
          size: typeof body.size === "number" ? body.size : Number.NaN,
        })
        if (!prepared.ok) return NextResponse.json({ error: prepared.error }, { status: prepared.status })
        return NextResponse.json({
          signedUrl: prepared.signedUrl,
          token: prepared.token,
          receipt: prepared.receipt,
        })
      }

      return NextResponse.json({ error: "Requête de dépôt incomplète." }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null

    if (!file || !type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json({ error: "Type de document invalide" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 })
    }

    const detected = detectUploadMimeAndExt(file)
    if (!detected) {
      return NextResponse.json(
        { error: "Format non autorisé (PDF, JPEG, PNG, WebP uniquement)" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { mimeType, extension } = detected
    const storagePath = buildGedStoragePath(
      userId,
      type,
      Date.now(),
      sanitizeFilenameBase(file.name),
      extension
    )

    let persistedPath = storagePath
    const uploaded = await uploadGedObject(buffer, storagePath, mimeType)
    if (uploaded) {
      persistedPath = `${uploaded.bucket}/${uploaded.storagePath}`
    } else if (!allowLocalGedFallback()) {
      console.error("[ged-upload] Supabase indisponible, conservation du fichier en base")
      persistedPath = encodeGedDatabaseFile(buffer)
    } else {
      await ensureUploadDir()
      const localFilename = `${userId}_${type}_${Date.now()}.${extension}`
      await writeFile(join(UPLOAD_DIR, localFilename), buffer)
      persistedPath = localFilename
    }

    const doc = await persistGedFileRecord({
      userId,
      type,
      filename: file.name,
      filepath: persistedPath,
      mimeType,
      size: file.size,
    })

    return NextResponse.json({
      id: doc.id,
      type: doc.type,
      filename: doc.filename,
      createdAt: doc.createdAt,
    })
  } catch (error) {
    return jsonError(error)
  }
}
