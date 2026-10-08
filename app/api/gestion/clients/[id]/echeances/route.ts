import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createMollieClient, type MollieClient } from "@mollie/api-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { EMAIL_TEMPLATES, emailNotSentBody, sendEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { applyEcheancePaidEffects, loadClientEcheances } from "@/lib/client-echeance-service"
import { findClientEcheance, readEcheanceCardLink, stringRecordFromMetadata } from "@/lib/client-echeances"
import { createStoredCardPayment, readRemoteCardLink, readRemotePaymentLock, retireRemoteCardLink } from "@/lib/gestion-card-link"
import { sendEcheancePaidReceipt, sendSepaFailureNotice } from "@/lib/echeance-receipt"
import { SITE_URL } from "@/lib/site-url"

const ECHEANCE_ID_RE = /^(decennale:\d+|avenant:[a-z0-9]+|attestation:[a-z0-9]+)$/i

type PendingCardRow = {
  id: string
  molliePaymentId: string
  metadata: string | null
  amount: number
}

async function listPendingCardPayments(userId: string, echeanceId: string): Promise<PendingCardRow[]> {
  const rows = await prisma.payment.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true, molliePaymentId: true, metadata: true, amount: true },
  })
  return rows.filter((row) => {
    if (!row.molliePaymentId || row.molliePaymentId.startsWith("manuel_")) return false
    return readEcheanceCardLink(row.metadata)?.echeanceId === echeanceId
  })
}

type CardRefresh =
  | { kind: "none" }
  | { kind: "open"; checkoutUrl: string; paymentId: string }
  | { kind: "paid" }
  | { kind: "cleared" }
  | { kind: "blocked"; message: string }

async function refreshPendingCardPayment(
  mollie: MollieClient | null,
  userId: string,
  echeanceId: string,
  raisonSociale: string
): Promise<CardRefresh> {
  const pendingRows = await listPendingCardPayments(userId, echeanceId)
  if (pendingRows.length === 0) return { kind: "none" }
  if (!mollie) {
    return {
      kind: "blocked",
      message: "Un lien carte est déjà enregistré et Mollie n'est pas joignable. Aucun second lien n'a été créé.",
    }
  }

  for (const pending of pendingRows) {
    const metadata = stringRecordFromMetadata(pending.metadata)
    const remote = await readRemoteCardLink(mollie, pending.molliePaymentId, metadata.checkoutUrl)
    if (remote.kind === "blocked") return remote
    if (remote.kind === "debit-open") {
      return {
        kind: "blocked",
        message: "Un prélèvement SEPA est déjà en cours. Aucun second lien n'a été créé.",
      }
    }

    if (remote.kind === "paid") {
      const claimed = await prisma.payment.updateMany({
        where: { id: pending.id, status: "pending" },
        data: {
          status: "paid",
          paidAt: new Date(),
          metadata: JSON.stringify({ ...metadata, effectsApplied: "true" }),
        },
      })
      if (claimed.count === 1) {
        await applyEcheancePaidEffects(metadata)
        await sendEcheancePaidReceipt({
          email: metadata.email || "",
          raisonSociale: metadata.raisonSociale || raisonSociale,
          metadata,
          amount: pending.amount,
        })
      }
      return { kind: "paid" }
    }

    if (remote.kind === "card-open") {
      for (const other of pendingRows) {
        if (other.id === pending.id) continue
        const otherMetadata = stringRecordFromMetadata(other.metadata)
        const otherRemote = await readRemoteCardLink(mollie, other.molliePaymentId, otherMetadata.checkoutUrl)
        if (otherRemote.kind === "paid") {
          const claimed = await prisma.payment.updateMany({
            where: { id: other.id, status: "pending" },
            data: {
              status: "paid",
              paidAt: new Date(),
              metadata: JSON.stringify({ ...otherMetadata, effectsApplied: "true" }),
            },
          })
          if (claimed.count === 1) {
            await applyEcheancePaidEffects(otherMetadata)
            await sendEcheancePaidReceipt({
              email: otherMetadata.email || "",
              raisonSociale: otherMetadata.raisonSociale || raisonSociale,
              metadata: otherMetadata,
              amount: other.amount,
            })
          }
          return { kind: "paid" }
        }
        if (otherRemote.kind === "card-open") {
          try {
            await retireRemoteCardLink(mollie, other.molliePaymentId)
          } catch (error) {
            console.warn("[gestion/clients/echeances] fermeture d'un ancien lien carte", other.molliePaymentId, error)
            return {
              kind: "blocked",
              message: "Un ancien lien carte est encore ouvert et n'a pas pu être fermé. Aucun second lien n'a été créé.",
            }
          }
        } else if (otherRemote.kind === "blocked" || otherRemote.kind === "debit-open") {
          return otherRemote.kind === "debit-open"
            ? {
                kind: "blocked",
                message: "Un prélèvement SEPA est déjà en cours. Aucun second lien n'a été créé.",
              }
            : otherRemote
        }
        await prisma.payment.updateMany({
          where: { id: other.id, status: "pending" },
          data: { status: "failed" },
        })
      }
      if (remote.checkoutUrl !== metadata.checkoutUrl) {
        await prisma.payment.update({
          where: { id: pending.id },
          data: { metadata: JSON.stringify({ ...metadata, checkoutUrl: remote.checkoutUrl }) },
        })
      }
      return { kind: "open", checkoutUrl: remote.checkoutUrl, paymentId: pending.molliePaymentId }
    }

    await prisma.payment.updateMany({
      where: { id: pending.id, status: "pending" },
      data: { status: "failed" },
    })
  }

  return { kind: "cleared" }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { id: userId } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }
    const raw = body as Record<string, unknown>
    const action =
      raw.action === "carte" || raw.action === "regler" || raw.action === "virement" || raw.action === "prevenir"
        ? raw.action
        : null
    const echeanceId = typeof raw.echeanceId === "string" ? raw.echeanceId.trim() : ""
    if (!action || !ECHEANCE_ID_RE.test(echeanceId)) {
      return NextResponse.json({ error: "Échéance ou action invalide." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, raisonSociale: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const echeance = findClientEcheance(await loadClientEcheances(userId), echeanceId)
    if (!echeance) {
      return NextResponse.json({ error: "Échéance introuvable." }, { status: 404 })
    }
    if (echeance.paid) {
      return NextResponse.json({ ok: true, alreadyPaid: true, echeances: await loadClientEcheances(userId) })
    }
    if (!(echeance.amount > 0)) {
      return NextResponse.json({ error: "Montant d'échéance invalide." }, { status: 400 })
    }

    const email = user.email.trim().toLowerCase()
    const raisonSociale = user.raisonSociale || email

    if (action === "prevenir") {
      if (!echeance.sepaFailure) {
        return NextResponse.json({ error: "Cette échéance n'a pas de prélèvement refusé." }, { status: 400 })
      }
      const sent = await sendSepaFailureNotice({
        email,
        raisonSociale,
        label: echeance.label,
        reason: echeance.sepaFailure,
        espaceUrl: `${SITE_URL}/espace-client/regularisation`,
      })
      await logAdminActivity({
        adminEmail: session.user.email,
        action: "echeance_refus_sepa_prevenu",
        targetType: "user",
        targetId: user.id,
        details: { echeanceId: echeance.id, emailSent: sent },
      })
      const echeances = await loadClientEcheances(userId)
      if (!sent) {
        return NextResponse.json({ ...emailNotSentBody(), echeances })
      }
      return NextResponse.json({ ok: true, sentTo: email, echeances })
    }

    const metadata: Record<string, string> = {
      type: action === "carte" ? "echeance_carte" : action === "virement" ? "virement_externe" : "echeance_manuelle",
      echeanceId: echeance.id,
      label: echeance.label,
      userId: user.id,
      email,
      raisonSociale,
    }
    if (echeance.installmentNumber) metadata.installmentNumber = String(echeance.installmentNumber)
    if (echeance.sepaSubscriptionId) metadata.sepaSubscriptionId = echeance.sepaSubscriptionId
    if (echeance.avenantFeeId) metadata.avenantFeeId = echeance.avenantFeeId
    if (echeance.attestationId) metadata.attestationId = echeance.attestationId

    const apiKey = process.env.MOLLIE_API_KEY
    const mollie = apiKey ? createMollieClient({ apiKey }) : null
    const refreshed = await refreshPendingCardPayment(mollie, userId, echeance.id, raisonSociale)
    if (refreshed.kind === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true, echeances: await loadClientEcheances(userId) })
    }
    if (refreshed.kind === "blocked") {
      return NextResponse.json({ error: refreshed.message }, { status: 409 })
    }
    if (action === "regler" && refreshed.kind === "open") {
      return NextResponse.json(
        { error: "Un lien carte est encore ouvert. Il n'est pas marqué réglé tant que ce lien peut encore être payé." },
        { status: 409 }
      )
    }

    let closedCardPaymentId = ""
    if (action === "virement" && refreshed.kind === "open") {
      closedCardPaymentId = refreshed.paymentId
      if (!mollie) {
        return NextResponse.json(
          { error: "Un lien carte est encore ouvert et Mollie n'est pas joignable. Le virement n'a pas été validé." },
          { status: 409 }
        )
      }
      try {
        await retireRemoteCardLink(mollie, closedCardPaymentId)
      } catch (error) {
        console.warn("[gestion/clients/echeances] fermeture du lien avant virement", closedCardPaymentId, error)
        return NextResponse.json(
          { error: "Le lien carte encore ouvert n'a pas pu être fermé. Le virement n'a pas été validé." },
          { status: 409 }
        )
      }
      await prisma.payment.updateMany({
        where: { molliePaymentId: closedCardPaymentId, status: "pending" },
        data: { status: "failed" },
      })
    }

    if (action === "virement" && echeance.kind === "decennale" && echeance.sepaSubscriptionId) {
      const subscription = await prisma.sepaSubscription.findUnique({
        where: { id: echeance.sepaSubscriptionId },
        select: { sepaPendingPaymentId: true, trimestresSepaPayes: true, firstTrimesterPaidAt: true },
      })
      const nextInstallment =
        (subscription?.firstTrimesterPaidAt ? 1 : 0) + Math.max(0, subscription?.trimestresSepaPayes ?? 0) + 1
      const pendingId = subscription?.sepaPendingPaymentId?.trim() || ""
      if (pendingId && echeance.installmentNumber === nextInstallment && pendingId !== closedCardPaymentId) {
        if (!mollie) {
          return NextResponse.json(
            { error: "Un prélèvement est déjà enregistré et Mollie n'est pas joignable. Le virement n'a pas été validé." },
            { status: 409 }
          )
        }
        const lock = await readRemotePaymentLock(mollie, pendingId)
        if (lock.kind === "debit-open" || lock.kind === "card-open") {
          return NextResponse.json(
            {
              error:
                lock.kind === "debit-open"
                  ? "Un prélèvement SEPA est déjà parti à la banque. Le virement n'a pas été validé."
                  : "Un lien carte est encore ouvert. Le virement n'a pas été validé.",
            },
            { status: 409 }
          )
        }
        if (lock.kind === "paid") {
          return NextResponse.json(
            { error: "Le prélèvement Mollie est déjà payé. Le virement n'a pas été enregistré." },
            { status: 409 }
          )
        }
        if (lock.kind === "blocked") {
          return NextResponse.json({ error: lock.message }, { status: 409 })
        }
      }
    }

    if (action === "regler" || action === "virement") {
      const paymentId = action === "virement" ? `virement_${randomUUID()}` : `manuel_${randomUUID()}`
      await prisma.payment.create({
        data: {
          userId: user.id,
          molliePaymentId: paymentId,
          amount: echeance.amount,
          status: "paid",
          paidAt: new Date(),
          metadata: JSON.stringify(metadata),
        },
      })
      await applyEcheancePaidEffects(metadata)
      const emailSent = await sendEcheancePaidReceipt({
        email,
        raisonSociale,
        metadata,
        amount: echeance.amount,
      })
      await logAdminActivity({
        adminEmail: session.user.email,
        action: action === "virement" ? "echeance_virement_externe" : "echeance_marquee_reglee",
        targetType: "user",
        targetId: user.id,
        details: { echeanceId: echeance.id, amount: echeance.amount, paymentId, emailSent, mode: action },
      })
      const echeances = await loadClientEcheances(userId)
      if (!emailSent) {
        return NextResponse.json({
          ok: true,
          emailSent: false,
          warning:
            action === "virement"
              ? "Virement enregistré, mais le reçu n'a pas pu être envoyé."
              : "Échéance marquée comme réglée, mais le reçu n'a pas pu être envoyé.",
          echeances,
        })
      }
      return NextResponse.json({ ok: true, emailSent: true, sentTo: email, echeances })
    }

    if (refreshed.kind === "open") {
      const template = EMAIL_TEMPLATES.paiementEcheanceCarte(
        raisonSociale,
        echeance.label,
        echeance.amount,
        refreshed.checkoutUrl,
        email
      )
      const sent = await sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      })
      await logAdminActivity({
        adminEmail: session.user.email,
        action: "echeance_lien_carte",
        targetType: "user",
        targetId: user.id,
        details: {
          echeanceId: echeance.id,
          amount: echeance.amount,
          paymentId: refreshed.paymentId,
          emailSent: sent,
          reused: true,
        },
      })
      const echeances = await loadClientEcheances(userId)
      if (!sent) {
        return NextResponse.json({
          ...emailNotSentBody(),
          reused: true,
          checkoutUrl: refreshed.checkoutUrl,
          amount: echeance.amount,
          paymentId: refreshed.paymentId,
          echeances,
        })
      }
      return NextResponse.json({
        ok: true,
        reused: true,
        sentTo: email,
        amount: echeance.amount,
        paymentId: refreshed.paymentId,
        checkoutUrl: refreshed.checkoutUrl,
        echeances,
      })
    }

    if (!mollie) {
      return NextResponse.json({ error: "Mollie non configuré" }, { status: 500 })
    }

    const created = await createStoredCardPayment({
      mollie,
      userId: user.id,
      amount: echeance.amount,
      description: `${echeance.label} — carte — ${raisonSociale}`,
      redirectTo: "/espace-client",
      metadata,
    })
    if (created.kind === "blocked") {
      return NextResponse.json({ error: created.message }, { status: 502 })
    }
    const checkoutUrl = created.checkoutUrl
    const paymentId = created.paymentId

    const template = EMAIL_TEMPLATES.paiementEcheanceCarte(
      raisonSociale,
      echeance.label,
      echeance.amount,
      checkoutUrl,
      email
    )
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })

    await logAdminActivity({
      adminEmail: session.user.email,
      action: "echeance_lien_carte",
      targetType: "user",
      targetId: user.id,
      details: { echeanceId: echeance.id, amount: echeance.amount, paymentId, emailSent: sent },
    })

    const echeances = await loadClientEcheances(userId)
    if (!sent) {
      return NextResponse.json({
        ...emailNotSentBody(),
        checkoutUrl,
        amount: echeance.amount,
        paymentId,
        echeances,
      })
    }

    return NextResponse.json({
      ok: true,
      sentTo: email,
      amount: echeance.amount,
      paymentId,
      checkoutUrl,
      echeances,
    })
  } catch (error) {
    console.error("[gestion/clients/echeances]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
