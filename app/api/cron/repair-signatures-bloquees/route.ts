import { NextRequest, NextResponse } from "next/server"
import { assertCronAuthorized } from "@/lib/cron-auth"
import { prisma } from "@/lib/prisma"
import { repairPendingSignature } from "@/lib/pending-signature-repair"

export const runtime = "nodejs"

/**
 * Répare automatiquement les signatures qui ont bien été finalisées côté Supabase,
 * mais dont la ligne `pendingSignature` est restée bloquée en base.
 */
export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request)
  if (unauthorized) return unauthorized

  try {
    const now = new Date()
    const olderThan = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const pendingRows = await prisma.pendingSignature.findMany({
      where: { createdAt: { lt: olderThan } },
      orderBy: { createdAt: "asc" },
      take: 25,
    })

    let repaired = 0
    let notSignedYet = 0
    let failed = 0
    const errors: Array<{ signatureRequestId: string; error: string }> = []

    for (const pending of pendingRows) {
      try {
        const result = await repairPendingSignature(pending, "cron@system", {
          action: "pending_signature_repaired_auto",
        })
        if (result.repaired) {
          repaired++
        } else if (result.code === "signed_not_found") {
          notSignedYet++
        } else {
          failed++
          errors.push({ signatureRequestId: pending.signatureRequestId, error: result.reason })
        }
      } catch (error) {
        failed++
        errors.push({
          signatureRequestId: pending.signatureRequestId,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        })
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: pendingRows.length,
      repaired,
      notSignedYet,
      failed,
      errors: errors.slice(0, 10),
    })
  } catch (error) {
    console.error("[cron/repair-signatures-bloquees]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
