import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { repairPendingSignature } from "@/lib/pending-signature-repair"

const UUID_RE = /^[0-9a-f-]{36}$/i

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }
    const signatureRequestId =
      typeof (body as { signatureRequestId?: unknown }).signatureRequestId === "string"
        ? ((body as { signatureRequestId?: string }).signatureRequestId ?? "").trim()
        : ""
    if (!UUID_RE.test(signatureRequestId)) {
      return NextResponse.json({ error: "signatureRequestId invalide" }, { status: 400 })
    }

    const pending = await prisma.pendingSignature.findUnique({
      where: { signatureRequestId },
    })
    if (!pending) {
      return NextResponse.json(
        { error: "Aucune signature en attente trouvée pour cet identifiant." },
        { status: 404 }
      )
    }

    const result = await repairPendingSignature(pending, session.user.email || "admin")
    if (!result.repaired) {
      return NextResponse.json({ error: result.reason }, { status: result.status })
    }

    return NextResponse.json({ ok: true, repaired: true })
  } catch (error) {
    console.error("[gestion/signatures/repair]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Réparation impossible" },
      { status: 500 }
    )
  }
}
