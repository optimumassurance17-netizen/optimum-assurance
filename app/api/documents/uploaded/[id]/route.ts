import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UPLOAD_DIR } from "@/lib/user-documents"

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

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const fullPath = join(UPLOAD_DIR, doc.filepath)
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
    }

    const buffer = await readFile(fullPath)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      },
    })
  } catch (error) {
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
      where: { id, userId: session.user.id },
    })

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const { unlink } = await import("fs/promises")
    const fullPath = join(UPLOAD_DIR, doc.filepath)
    if (existsSync(fullPath)) {
      await unlink(fullPath).catch(() => {})
    }

    await prisma.userDocument.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur suppression document:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
