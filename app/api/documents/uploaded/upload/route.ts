import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { writeFile, unlink } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import {
  UPLOAD_DIR,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  GED_SUPABASE_BUCKET,
  buildGedStoragePath,
  detectUploadMimeAndExt,
  ensureUploadDir,
  sanitizeFilenameBase,
} from "@/lib/user-documents"

function isSchemaDriftError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (((error as { code?: string }).code === "P2021") || ((error as { code?: string }).code === "P2022"))
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null

    if (!file || !type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json(
        { error: "Type de document invalide" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 Mo)" },
        { status: 400 }
      )
    }

    const detected = detectUploadMimeAndExt(file)
    if (!detected) {
      return NextResponse.json(
        { error: "Format non autorisé (PDF, JPEG, PNG, WebP uniquement)" },
        { status: 400 }
      )
    }

    const now = Date.now()
    const safeBaseName = sanitizeFilenameBase(file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    const { mimeType, extension } = detected
    const storagePath = buildGedStoragePath(
      session.user.id,
      type,
      now,
      safeBaseName,
      extension
    )

    // Fallback local si Supabase indisponible.
    let persistedPath = storagePath
    let persistedInSupabase = false
    const supabase = createSupabaseServiceClient()
    if (supabase) {
      const { error: uploadError } = await supabase.storage
        .from(GED_SUPABASE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        })
      if (!uploadError) {
        persistedInSupabase = true
      } else {
        console.error("[ged-upload] Supabase upload error:", uploadError)
      }
    }
    if (!persistedInSupabase) {
      await ensureUploadDir()
      const localFilename = `${session.user.id}_${type}_${now}.${extension}`
      const filepath = join(UPLOAD_DIR, localFilename)
      await writeFile(filepath, buffer)
      persistedPath = localFilename
    }

    const existing = await prisma.userDocument.findUnique({
      where: {
        userId_type: { userId: session.user.id, type },
      },
    })

    if (existing) {
      if (existing.filepath.startsWith("ged/")) {
        if (supabase) {
          try {
            await supabase.storage.from(GED_SUPABASE_BUCKET).remove([existing.filepath])
          } catch {
            // Suppression best-effort
          }
        }
      } else if (existsSync(join(UPLOAD_DIR, existing.filepath))) {
        await unlink(join(UPLOAD_DIR, existing.filepath)).catch(() => {})
      }
    }

    const doc = await prisma.userDocument.upsert({
      where: {
        userId_type: { userId: session.user.id, type },
      },
      create: {
        userId: session.user.id,
        type,
        filename: file.name,
        filepath: persistedPath,
        mimeType,
        size: file.size,
      },
      update: {
        filename: file.name,
        filepath: persistedPath,
        mimeType,
        size: file.size,
      },
    })

    return NextResponse.json({
      id: doc.id,
      type: doc.type,
      filename: doc.filename,
      createdAt: doc.createdAt,
    })
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.error("GED upload indisponible (schéma non aligné):", error)
      return NextResponse.json(
        { error: "GED temporairement indisponible: migration base requise" },
        { status: 503 }
      )
    }
    console.error("Erreur upload document:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    )
  }
}
