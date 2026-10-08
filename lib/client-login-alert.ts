import { isAdmin } from "@/lib/admin"
import { ACCOUNT_CREATION_INBOX } from "@/lib/account-creation-alert"
import { sendEmail } from "@/lib/email"
import { escapeHtmlForEmail } from "@/lib/email-layout"
import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/site-url"

const PENDING_ACTION = "client_login_pending"
/** Fenêtre où plusieurs POST de connexion identiques ne produisent qu'un email : le plus récent. */
const DEDUPE_WINDOW_MS = 2500
const DEDUPE_WAIT_MS = 800

type LoginAlertUser = {
  id?: string | null
  email?: string | null
  name?: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAdminAccount(email: string): boolean {
  return isAdmin({ user: { email } } as Parameters<typeof isAdmin>[0])
}

function formatParisDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date)
}

/**
 * Email interne à chaque connexion réussie d'un compte client.
 * Destinataire : info@optimum-assurance.eu.
 * Les doubles soumissions (double clic, requête répétée) n'envoient que la dernière.
 * Une connexion admin vers la gestion n'est pas signalée.
 */
export async function notifyClientSpaceLogin(user: LoginAlertUser): Promise<boolean> {
  const email = user.email?.trim().toLowerCase()
  const userId = user.id?.trim()
  if (!email || !userId || isAdminAccount(email)) return false

  const connectedAt = new Date()
  let pendingId: string
  try {
    const pending = await prisma.adminActivityLog.create({
      data: {
        adminEmail: "client-login@system",
        action: PENDING_ACTION,
        targetType: "user",
        targetId: userId,
        details: JSON.stringify({ email, at: connectedAt.toISOString() }),
      },
      select: { id: true },
    })
    pendingId = pending.id
  } catch (error) {
    console.error("[client-login-alert] journal:", error)
    return false
  }

  await sleep(DEDUPE_WAIT_MS)

  try {
    const latest = await prisma.adminActivityLog.findFirst({
      where: {
        action: PENDING_ACTION,
        targetType: "user",
        targetId: userId,
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    })

    if (!latest || latest.id !== pendingId) {
      await prisma.adminActivityLog.delete({ where: { id: pendingId } }).catch(() => undefined)
      return false
    }
  } catch (error) {
    console.error("[client-login-alert] dédoublonnage:", error)
    return false
  }

  const raisonSociale = user.name?.trim() || email
  const when = formatParisDate(connectedAt)
  const ficheUrl = `${SITE_URL}/gestion/clients/${userId}`
  const subject = `[Optimum] Connexion espace client — ${raisonSociale}`
  const lines = [
    `Client : ${raisonSociale}`,
    `Email : ${email}`,
    `Date : ${when}`,
    `Fiche : ${ficheUrl}`,
  ]
  const text = ["Alerte automatique — connexion espace client", "", ...lines].join("\n")
  const html = `
    <p style="font-weight:600;font-size:16px;margin:0 0 14px;color:#0f172a;">Connexion à l'espace client</p>
    ${lines
      .map((line) => `<p style="margin:0 0 8px;color:#0f172a;">${escapeHtmlForEmail(line)}</p>`)
      .join("")}
    <p style="margin-top:16px;"><a href="${ficheUrl}" style="color:#2563eb;font-weight:bold;">Ouvrir la fiche client</a></p>
  `.trim()

  let sent = false
  try {
    sent = await sendEmail({
      to: ACCOUNT_CREATION_INBOX,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error("[client-login-alert] envoi:", error)
  }

  await prisma.adminActivityLog
    .update({
      where: { id: pendingId },
      data: {
        action: sent ? "client_login_alert" : "client_login_alert_failed",
        details: JSON.stringify({ email, at: connectedAt.toISOString(), sent }),
      },
    })
    .catch((error) => console.error("[client-login-alert] mise à jour journal:", error))

  return sent
}
