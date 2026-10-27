import { NextRequest, NextResponse } from "next/server"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

/**
 * Les signatures se finalisent dans l'application, au moment où le client signe.
 * Ce cron ne récupère plus de pièce dans Supabase : il compte seulement les dossiers encore ouverts.
 */
export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request)
  if (unauthorized) return unauthorized

  try {
    const olderThan = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const pendingRows = await prisma.pendingSignature.findMany({
      where: { createdAt: { lt: olderThan } },
      orderBy: { createdAt: "asc" },
      take: 25,
      select: { signatureRequestId: true },
    })

    return NextResponse.json({
      ok: true,
      scanned: pendingRows.length,
      repaired: 0,
      notSignedYet: pendingRows.length,
      localFallback: pendingRows.length,
      failed: 0,
      errors: [],
    })
  } catch (error) {
    console.error("[cron/repair-signatures-bloquees]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
