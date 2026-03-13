import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { writeFile, unlink } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  UPLOAD_DIR,
  ALLOWED_TYPES,
  ALLOWED_MIMES,
  MAX_FILE_SIZE,
  ensureUploadDir,
} from "@/lib/user-documents"

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

    const mimeType = file.type
    if (!ALLOWED_MIMES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Format non autorisé (PDF, JPEG, PNG, WebP uniquement)" },
        { status: 400 }
      )
    }

    await ensureUploadDir()

    const ext = mimeType === "application/pdf" ? "pdf" : "jpg"
    const filename = `${session.user.id}_${type}_${Date.now()}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const existing = await prisma.userDocument.findUnique({
      where: {
        userId_type: { userId: session.user.id, type },
      },
    })

    if (existing && existsSync(join(UPLOAD_DIR, existing.filepath))) {
      await unlink(join(UPLOAD_DIR, existing.filepath)).catch(() => {})
    }

    const doc = await prisma.userDocument.upsert({
      where: {
        userId_type: { userId: session.user.id, type },
      },
      create: {
        userId: session.user.id,
        type,
        filename: file.name,
        filepath: filename,
        mimeType,
        size: file.size,
      },
      update: {
        filename: file.name,
        filepath: filename,
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
    console.error("Erreur upload document:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    )
  }
}
