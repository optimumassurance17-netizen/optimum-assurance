import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { clientEcheanceStatusLabel, findClientEcheance, nextUnpaidEcheance } from "@/lib/client-echeances"
import { loadClientEcheances } from "@/lib/client-echeance-service"
import { createMollieClientFromEnv, echeanceCardMatch, resolveOpenCardLink } from "@/lib/open-card-link"
import { prisma } from "@/lib/prisma"

function publicEcheance(row: {
  id: string
  label: string
  amount: number
  dueDate: string | null
  paid: boolean
  cardLinkStatus: "none" | "open" | "expired"
  cardLinkSentAt: string | null
}, now: Date) {
  return {
    id: row.id,
    label: row.label,
    amount: row.amount,
    dueDate: row.dueDate,
    paid: row.paid,
    cardLinkStatus: row.cardLinkStatus,
    cardLinkSentAt: row.cardLinkSentAt,
    statusLabel: clientEcheanceStatusLabel(row, now),
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    const rows = await loadClientEcheances(session.user.id)
    const now = new Date()
    const next = nextUnpaidEcheance(rows)
    return NextResponse.json({
      echeance: next ? publicEcheance(next, now) : null,
      echeances: rows.map((row) => publicEcheance(row, now)),
    })
  } catch (error) {
    console.error("[client/prochaine-echeance] GET", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

/** Renvoie le lien carte déjà ouvert. Ne crée pas de paiement. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    const echeanceId =
      body && typeof body === "object" && typeof (body as { echeanceId?: unknown }).echeanceId === "string"
        ? (body as { echeanceId: string }).echeanceId.trim()
        : ""
    if (!echeanceId) {
      return NextResponse.json({ error: "Échéance invalide." }, { status: 400 })
    }

    const rows = await loadClientEcheances(session.user.id)
    const echeance = findClientEcheance(rows, echeanceId)
    if (!echeance) {
      return NextResponse.json({ error: "Échéance introuvable." }, { status: 404 })
    }
    if (echeance.paid) {
      return NextResponse.json({ ok: true, alreadyPaid: true })
    }
    if (echeance.cardLinkStatus === "expired") {
      return NextResponse.json(
        { error: "Le lien de paiement a expiré. Aucun nouveau lien n'a été créé." },
        { status: 409 }
      )
    }
    if (echeance.cardLinkStatus !== "open") {
      return NextResponse.json(
        { error: "Aucun lien de paiement n'a encore été envoyé pour cette échéance." },
        { status: 409 }
      )
    }

    const account = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { raisonSociale: true, email: true },
    })
    const resolved = await resolveOpenCardLink({
      mollie: createMollieClientFromEnv(),
      userId: session.user.id,
      match: echeanceCardMatch(echeance.id, echeance.attestationId),
      raisonSociale: account?.raisonSociale || account?.email || "",
    })
    if (resolved.kind === "open") {
      return NextResponse.json({ ok: true, reused: true, checkoutUrl: resolved.checkoutUrl })
    }
    if (resolved.kind === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true })
    }
    if (resolved.kind === "blocked") {
      return NextResponse.json({ error: resolved.message }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Le lien de paiement n'est plus ouvert. Aucun nouveau lien n'a été créé." },
      { status: 409 }
    )
  } catch (error) {
    console.error("[client/prochaine-echeance] POST", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
