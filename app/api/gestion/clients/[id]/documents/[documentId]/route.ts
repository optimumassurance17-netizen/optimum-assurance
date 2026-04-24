import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { GED_SUPABASE_BUCKET, resolveGedFileReadTarget } from "@/lib/user-documents"

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
      select: { id: true, filename: true, filepath: true, mimeType: true },
    })

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
    }

    const resolved = resolveGedFileReadTarget(doc.filepath)

    let fileBytes: Uint8Array
    if (resolved.kind === "supabase") {
      const supabase = createSupabaseServiceClient()
      if (!supabase) {
        return NextResponse.json({ error: "Stockage GED indisponible" }, { status: 503 })
      }
      const { data, error } = await supabase.storage.from(GED_SUPABASE_BUCKET).download(resolved.path)
      if (error || !data) {
        return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
      }
      fileBytes = new Uint8Array(await data.arrayBuffer())
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
