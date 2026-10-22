import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { existsSync } from "fs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { openGedDocument } from "@/lib/ged-open"
import { isClientReadableGedType } from "@/lib/ged-policy"
import { resolveGedFileStorageTarget } from "@/lib/user-documents"
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
      where: { id, userId: session.user.id },
    })

    if (!doc || !isClientReadableGedType(doc.type)) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    return openGedDocument({
      id: doc.id,
      userId: doc.userId,
      type: doc.type,
      filename: doc.filename,
      filepath: doc.filepath,
      mimeType: doc.mimeType,
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
    const { unlink } = await import("fs/promises")
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
    }
    if (storageTarget.kind === "local") {
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
