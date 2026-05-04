import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { getLocalGedPathCandidates, resolveGedFileReadTarget, resolveGedFileStorageTarget } from "@/lib/user-documents"
import { UPLOAD_DOC_TYPES } from "@/lib/user-document-types"

function isSchemaDriftError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (((error as { code?: string }).code === "P2021") || ((error as { code?: string }).code === "P2022"))
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    const doc = await prisma.userDocument.findFirst({
      where: { id, userId: session.user.id, type: { in: [...UPLOAD_DOC_TYPES] } },
    })

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const readTarget = resolveGedFileReadTarget(doc.filepath)
    let buffer: Buffer
    if (readTarget.kind === "supabase") {
      const supabase = createSupabaseServiceClient()
      if (!supabase) {
        return NextResponse.json({ error: "Stockage GED indisponible" }, { status: 503 })
      }
      let downloaded: Blob | null = null
      for (const candidate of readTarget.candidates) {
        const { data, error } = await supabase.storage.from(candidate.bucket).download(candidate.path)
        if (!error && data) {
          downloaded = data
          break
        }
      }
      if (downloaded) {
        buffer = Buffer.from(await downloaded.arrayBuffer())
      } else {
        // Fallback legacy: certains fichiers ont été migrés avec un filepath "type Supabase"
        // mais résident encore localement.
        const localCandidates = getLocalGedPathCandidates(doc.filepath)
        const existingLocalPath = localCandidates.find((candidate) => existsSync(candidate))
        if (!existingLocalPath) {
          return NextResponse.json(
            {
              error:
                "Fichier introuvable. Ce document GED semble provenir d'un ancien stockage local et n'est plus disponible sur le serveur actuel.",
            },
            { status: 404 }
          )
        }
        buffer = await readFile(existingLocalPath)
      }
    } else {
      if (!existsSync(readTarget.path)) {
        return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
      }
      buffer = await readFile(readTarget.path)
    }

    const fileBytes = new Uint8Array(buffer)
    return new NextResponse(fileBytes, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      },
    })
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.error("GED download indisponible (schéma non aligné):", error)
      return NextResponse.json(
        { error: "GED temporairement indisponible: migration base requise" },
        { status: 503 }
      )
    }
    console.error("Erreur téléchargement document:", error)
    return NextResponse.json(
      { error: "Erreur lors du téléchargement" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    const doc = await prisma.userDocument.findFirst({
      where: { id, userId: session.user.id, type: { in: [...UPLOAD_DOC_TYPES] } },
    })

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const storageTarget = resolveGedFileStorageTarget(doc.filepath)
    if (storageTarget.kind === "supabase") {
      const supabase = createSupabaseServiceClient()
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
    } else {
      const { unlink } = await import("fs/promises")
      for (const fullPath of storageTarget.paths) {
        if (existsSync(fullPath)) {
          await unlink(fullPath).catch(() => {})
        }
      }
    }

    await prisma.userDocument.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.error("GED delete indisponible (schéma non aligné):", error)
      return NextResponse.json(
        { error: "GED temporairement indisponible: migration base requise" },
        { status: 503 }
      )
    }
    console.error("Erreur suppression document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
