import type { PendingSignature } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { EMAIL_NOT_SENT_MESSAGE, EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { isReminderUnsubscribed } from "@/lib/reminder-unsubscribe"
import { signatureReminderPayload } from "@/lib/signature-reminder"
import { SITE_URL } from "@/lib/site-url"

export type SignatureReminderSendResult =
  | { ok: true; emailSent: true; sentTo: string; signatureLink: string; message: string }
  | { ok: true; emailSent: false; sentTo: string; signatureLink: string; warning: string; message: string }
  | { ok: false; error: string; status: number }

/** Renvoie le lien de signature déjà ouvert. Ne crée pas de nouvelle demande. */
export async function sendPendingSignatureReminder(input: {
  pending: PendingSignature
  adminEmail: string
}): Promise<SignatureReminderSendResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.pending.userId },
    select: { id: true, email: true, raisonSociale: true },
  })
  const email = user?.email?.trim().toLowerCase() || ""
  if (!user || !email) {
    return { ok: false, error: "Aucun email client pour envoyer le rappel de signature.", status: 404 }
  }
  if (await isReminderUnsubscribed(email, "signature")) {
    return {
      ok: false,
      error: "Ce client s'est désinscrit des rappels de signature. L'email n'a pas été envoyé.",
      status: 409,
    }
  }

  const payload = signatureReminderPayload(
    input.pending,
    (user.raisonSociale || email).trim(),
    SITE_URL
  )
  const template = EMAIL_TEMPLATES.rappelSignatureEnAttente(
    payload.raisonSociale,
    payload.signatureLink,
    email,
    { produitLabel: payload.produitLabel, reference: payload.reference }
  )
  const sent = await sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  })
  await logAdminActivity({
    adminEmail: input.adminEmail,
    action: "signature_relance_manuelle",
    targetType: "user",
    targetId: user.id,
    details: {
      signatureRequestId: input.pending.signatureRequestId,
      contractNumero: input.pending.contractNumero,
      emailSent: sent,
      source: "repair_button",
    },
  })
  if (!sent) {
    return {
      ok: true,
      emailSent: false,
      sentTo: email,
      signatureLink: payload.signatureLink,
      warning: EMAIL_NOT_SENT_MESSAGE,
      message: EMAIL_NOT_SENT_MESSAGE,
    }
  }
  return {
    ok: true,
    emailSent: true,
    sentTo: email,
    signatureLink: payload.signatureLink,
    message: `Rappel de signature envoyé à ${email}.`,
  }
}
