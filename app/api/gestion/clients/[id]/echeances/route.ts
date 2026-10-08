import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createMollieClient, Locale, PaymentMethod, type MollieClient } from "@mollie/api-client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { EMAIL_TEMPLATES, emailNotSentBody, sendEmail } from "@/lib/email"
import { getMolliePublicBaseUrl } from "@/lib/mollie-public-base-url"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { applyEcheancePaidEffects, loadClientEcheances } from "@/lib/client-echeance-service"
import {
  findClientEcheance,
  mollieCardLinkIsClosed,
  molliePaymentIsOpen,
  readEcheanceCardLink,
  stringRecordFromMetadata,
} from "@/lib/client-echeances"
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
    let remote
    try {
      remote = await mollie.payments.get(pending.molliePaymentId)
    } catch (error) {
      console.error("[gestion/clients/echeances] lecture du lien carte", error)
      return {
        kind: "blocked",
        message: "Impossible de vérifier le lien carte déjà envoyé. Aucun second lien n'a été créé.",
      }
    }

    const metadata = stringRecordFromMetadata(pending.metadata)
    if (remote.status === "paid") {
      const claimed = await prisma.payment.updateMany({
        where: { id: pending.id, status: "pending" },
        data: { status: "paid", paidAt: new Date() },
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

    if (molliePaymentIsOpen(remote.status)) {
      const checkoutUrl = remote._links?.checkout?.href || readEcheanceCardLink(pending.metadata)?.checkoutUrl || ""
      if (!checkoutUrl) {
        return {
          kind: "blocked",
          message: "Le lien carte est encore ouvert, mais Mollie n'a pas renvoyé son adresse.",
        }
      }
      for (const other of pendingRows) {
        if (other.id === pending.id) continue
        try {
          const otherPayment = await mollie.payments.get(other.molliePaymentId)
          if (otherPayment.status === "paid") {
            const claimed = await prisma.payment.updateMany({
              where: { id: other.id, status: "pending" },
              data: { status: "paid", paidAt: new Date() },
            })
            if (claimed.count === 1) {
              const otherMetadata = stringRecordFromMetadata(other.metadata)
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
          if (molliePaymentIsOpen(otherPayment.status)) {
            try {
              await mollie.payments.cancel(other.molliePaymentId)
            } catch (error) {
              console.warn("[gestion/clients/echeances] annulation d'un ancien lien carte", other.molliePaymentId, error)
            }
          }
        } catch (error) {
          console.warn("[gestion/clients/echeances] lecture d'un ancien lien carte", other.molliePaymentId, error)
        }
        await prisma.payment.updateMany({
          where: { id: other.id, status: "pending" },
          data: { status: "failed" },
        })
      }
      if (remote._links?.checkout?.href && remote._links.checkout.href !== metadata.checkoutUrl) {
        await prisma.payment.update({
          where: { id: pending.id },
          data: { metadata: JSON.stringify({ ...metadata, checkoutUrl: remote._links.checkout.href }) },
        })
      }
      return { kind: "open", checkoutUrl, paymentId: pending.molliePaymentId }
    }

    if (mollieCardLinkIsClosed(remote.status)) {
      await prisma.payment.updateMany({
        where: { id: pending.id, status: "pending" },
        data: { status: "failed" },
      })
      continue
    }

    return {
      kind: "blocked",
      message: "Le lien carte est dans un état inattendu. Aucun second lien n'a été créé.",
    }
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
    const action = raw.action === "carte" || raw.action === "regler" || raw.action === "prevenir" ? raw.action : null
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
      type: action === "carte" ? "echeance_carte" : "echeance_manuelle",
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

    if (action === "regler") {
      const paymentId = `manuel_${randomUUID()}`
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
      await logAdminActivity({
        adminEmail: session.user.email,
        action: "echeance_marquee_reglee",
        targetType: "user",
        targetId: user.id,
        details: { echeanceId: echeance.id, amount: echeance.amount, paymentId },
      })
      return NextResponse.json({ ok: true, echeances: await loadClientEcheances(userId) })
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

    const baseUrl = getMolliePublicBaseUrl()
    const payment = await mollie.payments.create({
      amount: { currency: "EUR", value: echeance.amount.toFixed(2) },
      description: `${echeance.label} — carte — ${raisonSociale}`,
      redirectUrl: `${baseUrl}/espace-client`,
      webhookUrl: `${baseUrl}/api/mollie/webhook`,
      method: PaymentMethod.creditcard,
      locale: Locale.fr_FR,
      metadata,
    })
    const checkoutUrl = payment._links?.checkout?.href
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Mollie n'a pas renvoyé de lien de paiement." }, { status: 502 })
    }

    await prisma.payment.create({
      data: {
        userId: user.id,
        molliePaymentId: payment.id,
        amount: echeance.amount,
        status: "pending",
        metadata: JSON.stringify({ ...metadata, checkoutUrl }),
      },
    })

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
      details: { echeanceId: echeance.id, amount: echeance.amount, paymentId: payment.id, emailSent: sent },
    })

    const echeances = await loadClientEcheances(userId)
    if (!sent) {
      return NextResponse.json({
        ...emailNotSentBody(),
        checkoutUrl,
        amount: echeance.amount,
        paymentId: payment.id,
        echeances,
      })
    }

    return NextResponse.json({
      ok: true,
      sentTo: email,
      amount: echeance.amount,
      paymentId: payment.id,
      checkoutUrl,
      echeances,
    })
  } catch (error) {
    console.error("[gestion/clients/echeances]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
