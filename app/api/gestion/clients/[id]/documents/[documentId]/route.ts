import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { resolveGedFileReadTarget } from "@/lib/user-documents"

function buildReadableGedFilename(raw: string): string {
  const safe = raw.replace(/"/g, "")
  return encodeURIComponent(safe).replace(/%20/g, " ")
}

async function downloadFromSupabaseWithFallback(candidates: { bucket: string; path: string }[]): Promise<Uint8Array | null> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) return null

  for (const candidate of candidates) {
    const { data, error } = await supabase.storage.from(candidate.bucket).download(candidate.path)
    if (!error && data) return new Uint8Array(await data.arrayBuffer())
  }
  return null
}

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
      const fromSupabase = await downloadFromSupabaseWithFallback(resolved.candidates)
      if (!fromSupabase) {
        return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
      }
      fileBytes = fromSupabase
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
        "Content-Disposition": `inline; filename="${buildReadableGedFilename(doc.filename)}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      },
    })
  } catch (error) {
    console.error("[gestion/clients/:id/documents/:documentId] GET", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
