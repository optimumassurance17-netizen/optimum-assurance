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
  resolveGedFileStorageTarget,
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

const GED_BUCKET_FALLBACKS = [
  GED_SUPABASE_BUCKET,
  "client_documents",
  "documents",
  "client-documents",
  "user_documents",
  "uploads",
]

function allowLocalGedFallback(): boolean {
  if (process.env.GED_ALLOW_LOCAL_FALLBACK === "1") return true
  const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase()
  // En prod/preview serverless, le /tmp n'est pas durable entre invocations.
  if (vercelEnv === "production" || vercelEnv === "preview") return false
  return process.env.NODE_ENV !== "production"
}

async function resolveUploadBuckets(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>
): Promise<string[]> {
  const defaults = [...new Set(GED_BUCKET_FALLBACKS.map((b) => b.trim()).filter(Boolean))]
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error || !data) return defaults
    const available = new Set(
      data.map((bucket) => bucket?.name?.trim()).filter((name): name is string => Boolean(name))
    )
    const presentDefaults = defaults.filter((name) => available.has(name))
    if (presentDefaults.length > 0) return presentDefaults
    return [...available]
  } catch {
    return defaults
  }
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

    // En production, on n'accepte plus de fallback local durablement cassant.
    let persistedPath = storagePath
    let persistedInSupabase = false
    const uploadErrors: string[] = []
    const supabase = createSupabaseServiceClient()
    if (supabase) {
      const buckets = await resolveUploadBuckets(supabase)
      for (const bucket of buckets) {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
          })
        if (!uploadError) {
          persistedInSupabase = true
          // On conserve le bucket dans le filepath pour fiabiliser la lecture future.
          persistedPath = `${bucket}/${storagePath}`
          break
        }
        uploadErrors.push(`${bucket}: ${uploadError.message}`)
      }
    }
    if (!persistedInSupabase) {
      if (!allowLocalGedFallback()) {
        console.error("[ged-upload] Aucun bucket GED Supabase utilisable:", uploadErrors.join(" | "))
        return NextResponse.json(
          {
            error:
              "Stockage GED indisponible (bucket Supabase absent/inaccessible). Merci de contacter la gestion.",
          },
          { status: 503 }
        )
      }
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
      const storageTarget = resolveGedFileStorageTarget(existing.filepath)
      if (storageTarget.kind === "supabase") {
        if (supabase) {
          try {
            const byBucket = new Map<string, string[]>()
            for (const candidate of storageTarget.candidates) {
              const list = byBucket.get(candidate.bucket) ?? []
              list.push(candidate.path)
              byBucket.set(candidate.bucket, list)
            }
            for (const [bucket, paths] of byBucket.entries()) {
              await supabase.storage.from(bucket).remove(paths)
            }
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
