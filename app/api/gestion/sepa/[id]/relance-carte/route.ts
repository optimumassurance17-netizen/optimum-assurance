import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { logAdminActivity } from "@/lib/admin-activity"
import { loadClientEcheances } from "@/lib/client-echeance-service"
import { cardPaymentMatches } from "@/lib/client-echeances"
import { EMAIL_TEMPLATES, emailNotSentBody, sendEmail } from "@/lib/email"
import { createStoredCardPayment, readRemotePaymentLock, rememberOpenCardPayment } from "@/lib/gestion-card-link"
import { createMollieClientFromEnv, echeanceCardMatch, resolveOpenCardLink } from "@/lib/open-card-link"
import { prisma } from "@/lib/prisma"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const sub = await prisma.sepaSubscription.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, raisonSociale: true } } },
    })
    if (!sub) {
      return NextResponse.json({ error: "Abonnement SEPA introuvable" }, { status: 404 })
    }
    if (sub.status === "cancelled") {
      return NextResponse.json({ error: "Cet abonnement est annulé." }, { status: 400 })
    }

    const email = sub.user.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "Aucun email client sur ce dossier." }, { status: 400 })
    }

    const next = (await loadClientEcheances(sub.userId)).find((row) => row.kind === "decennale" && !row.paid)
    if (!next || !(next.amount > 0)) {
      return NextResponse.json({ error: "Aucune échéance décennale à relancer." }, { status: 400 })
    }

    const raisonSociale = sub.user.raisonSociale || email
    const metadata: Record<string, string> = {
      type: "echeance_carte",
      echeanceId: next.id,
      label: next.label,
      userId: sub.userId,
      email,
      raisonSociale,
      paiementCarteRelance: "true",
    }
    if (next.installmentNumber) metadata.installmentNumber = String(next.installmentNumber)
    if (next.sepaSubscriptionId) metadata.sepaSubscriptionId = next.sepaSubscriptionId

    const mollie = createMollieClientFromEnv()
    if (!mollie) {
      return NextResponse.json({ error: "Mollie non configuré" }, { status: 500 })
    }

    const existing = await resolveOpenCardLink({
      mollie,
      userId: sub.userId,
      match: echeanceCardMatch(next.id),
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
    let reused = existing.kind === "open"

    if (sub.sepaPendingPaymentId && sub.sepaPendingPaymentId !== paymentId) {
      const remote = await readRemotePaymentLock(mollie, sub.sepaPendingPaymentId)
      if (remote.kind === "paid") {
        const local = await prisma.payment.findUnique({
          where: { molliePaymentId: sub.sepaPendingPaymentId },
          select: { metadata: true, status: true },
        })
        const stalePaid =
          local?.status === "paid" && !cardPaymentMatches(local.metadata, { echeanceId: next.id })
        if (!stalePaid) {
          return NextResponse.json({ ok: true, alreadyPaid: true })
        }
      }
      if (remote.kind === "debit-open") {
        return NextResponse.json(
          { error: "Un prélèvement SEPA est déjà en cours. Aucun lien carte n'a été créé." },
          { status: 409 }
        )
      }
      if (remote.kind === "blocked") {
        return NextResponse.json({ error: remote.message }, { status: 409 })
      }
      if (remote.kind === "card-open" && !reused) {
        await rememberOpenCardPayment({
          userId: sub.userId,
          molliePaymentId: sub.sepaPendingPaymentId,
          amount: next.amount,
          metadata: {
            type: "echeance_carte",
            cardLinkEcheanceId: next.id,
            label: next.label,
            userId: sub.userId,
            email,
            raisonSociale,
            paiementCarteRelance: "true",
          },
          checkoutUrl: remote.checkoutUrl,
        })
        checkoutUrl = remote.checkoutUrl
        paymentId = sub.sepaPendingPaymentId
        reused = true
      }
    }

    if (!reused) {
      const created = await createStoredCardPayment({
        mollie,
        userId: sub.userId,
        amount: next.amount,
        description: `${next.label} — carte — ${raisonSociale}`,
        redirectPath: "/espace-client",
        metadata,
      })
      if (created.kind === "blocked") {
        return NextResponse.json({ error: created.message }, { status: 502 })
      }
      checkoutUrl = created.checkoutUrl
      paymentId = created.paymentId
    }

    if ((next.installmentNumber ?? 0) > 1) {
      await prisma.sepaSubscription.update({
        where: { id: sub.id },
        data: { sepaPendingPaymentId: paymentId, lastError: null },
      })
    }

    const template = EMAIL_TEMPLATES.relanceEcheanceCarte(raisonSociale, next.amount, checkoutUrl, email)
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })

    await logAdminActivity({
      adminEmail: session.user.email,
      action: "echeance_lien_carte",
      targetType: "sepa",
      targetId: sub.id,
      details: { echeanceId: next.id, amount: next.amount, paymentId, emailSent: sent, reused },
    })

    if (!sent) {
      return NextResponse.json({
        ...emailNotSentBody(),
        reused,
        checkoutUrl,
        amount: next.amount,
        paymentId,
      })
    }

    return NextResponse.json({
      ok: true,
      reused,
      sentTo: email,
      amount: next.amount,
      paymentId,
      checkoutUrl,
    })
  } catch (error) {
    console.error("[gestion/sepa/relance-carte]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
