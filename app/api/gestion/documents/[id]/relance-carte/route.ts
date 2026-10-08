import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { logAdminActivity } from "@/lib/admin-activity"
import { findClientEcheance } from "@/lib/client-echeances"
import { loadClientEcheances } from "@/lib/client-echeance-service"
import { EMAIL_TEMPLATES, emailNotSentBody, sendEmail } from "@/lib/email"
import { createStoredCardPayment } from "@/lib/gestion-card-link"
import { attestationCardMatch, createMollieClientFromEnv, resolveOpenCardLink } from "@/lib/open-card-link"
import { prisma } from "@/lib/prisma"

const DECENNALE_ATTESTATION_TYPES = ["attestation", "attestation_nominative"] as const

function montantDuFromAttestation(data: string): number {
  try {
    const parsed = JSON.parse(data) as { primeAnnuelle?: number; primeTrimestrielle?: number }
    if (typeof parsed.primeTrimestrielle === "number" && parsed.primeTrimestrielle > 0) {
      return Math.round(parsed.primeTrimestrielle * 100) / 100
    }
    const annuelle = typeof parsed.primeAnnuelle === "number" ? parsed.primeAnnuelle : 0
    return Math.round((annuelle / 4) * 100) / 100
  } catch {
    return 0
  }
}

/** Envoie au client un lien de paiement carte pour une attestation décennale suspendue. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Mollie non configuré" }, { status: 500 })
    }

    const { id } = await params
    const document = await prisma.document.findFirst({
      where: {
        id,
        type: { in: [...DECENNALE_ATTESTATION_TYPES] },
        status: "suspendu",
      },
      include: { user: true },
    })
    if (!document) {
      return NextResponse.json(
        { error: "Attestation décennale suspendue introuvable." },
        { status: 404 }
      )
    }

    const email = document.user.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "Aucun email client sur cette attestation." }, { status: 400 })
    }

    const amount = montantDuFromAttestation(document.data)
    if (!(amount > 0)) {
      return NextResponse.json(
        { error: "Montant de régularisation introuvable sur l'attestation." },
        { status: 400 }
      )
    }

    const raisonSociale = document.user.raisonSociale || email
    const echeance = findClientEcheance(await loadClientEcheances(document.userId), `attestation:${document.id}`)
    if (echeance?.paid) {
      return NextResponse.json({ ok: true, alreadyPaid: true })
    }

    const metadata = {
      type: "regularisation",
      attestationId: document.id,
      attestationNumero: document.numero,
      label: `Régularisation ${document.numero}`,
      userId: document.userId,
      email,
      raisonSociale,
    }
    const mollie = createMollieClientFromEnv()
    if (!mollie) {
      return NextResponse.json({ error: "Mollie non configuré" }, { status: 500 })
    }
    const existing = await resolveOpenCardLink({
      mollie,
      userId: document.userId,
      match: attestationCardMatch(document.id),
      raisonSociale,
    })
    if (existing.kind === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true })
    }
    if (existing.kind === "blocked") {
      return NextResponse.json({ error: existing.message }, { status: 409 })
    }

    let checkoutUrl = existing.kind === "open" ? existing.checkoutUrl : ""
    let paymentId = existing.kind === "open" ? existing.paymentId : ""
    const reused = existing.kind === "open"
    if (!reused) {
      const created = await createStoredCardPayment({
        mollie,
        userId: document.userId,
        amount,
        description: `Régularisation décennale — ${raisonSociale} (${document.numero})`,
        redirectPath: "/confirmation?regularisation=1",
        metadata,
      })
      if (created.kind === "blocked") {
        return NextResponse.json({ error: created.message }, { status: 502 })
      }
      checkoutUrl = created.checkoutUrl
      paymentId = created.paymentId
    }

    const template = EMAIL_TEMPLATES.relanceEcheanceCarte(raisonSociale, amount, checkoutUrl, email)
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })

    await logAdminActivity({
      adminEmail: session.user.email,
      action: "echeance_lien_carte",
      targetType: "document",
      targetId: document.id,
      details: { attestationId: document.id, amount, paymentId, emailSent: sent, reused },
    })

    if (!sent) {
      return NextResponse.json({
        ...emailNotSentBody(),
        reused,
        checkoutUrl,
        amount,
        paymentId,
      })
    }

    return NextResponse.json({
      ok: true,
      reused,
      sentTo: email,
      amount,
      paymentId,
      checkoutUrl,
    })
  } catch (error) {
    console.error("[gestion/documents/relance-carte]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
