import bcrypt from "bcryptjs"
import { randomBytes } from "node:crypto"
import { sendEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/site-url"

export type ClientAccessEmailMode = "created" | "resent"

let bcryptRandomReady = false

function ensureBcryptRandom(): void {
  if (bcryptRandomReady) return
  bcrypt.setRandomFallback((len: number) => Array.from(randomBytes(len)))
  bcryptRandomReady = true
}

/** Hash synchrone : l'import nommé `{ hash }` et le chemin async de bcryptjs cassent dans le bundle serveur. */
export function hashTemporaryPassword(password: string): string {
  ensureBcryptRandom()
  return bcrypt.hashSync(password, 10)
}

/**
 * N'écrit que passwordHash. Un update Prisma sans SQL brut relit toutes les colonnes User
 * et échoue si la prod n'a pas encore les questionnaires titre.
 */
export async function replaceUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
  const updated = await prisma.$executeRaw`
    UPDATE "User"
    SET "passwordHash" = ${passwordHash}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${userId}
  `
  if (Number(updated) !== 1) {
    throw new Error("Compte client introuvable pour enregistrer le mot de passe")
  }
}

export function clientAccessErrorMessage(error: unknown): string {
  const record = error && typeof error === "object" ? (error as { code?: unknown; message?: unknown }) : null
  const code = typeof record?.code === "string" ? record.code : ""
  const message = error instanceof Error ? error.message : typeof record?.message === "string" ? record.message : ""
  const safe = message.replace(/\s+/g, " ").trim().slice(0, 180)
  const secret = /postgres(ql)?:\/\/|api[_-]?key|secret|bearer |password=/i.test(safe)
  if (code === "P2021" || code === "P2022") {
    return "La base n'a pas toutes les colonnes du compte. L'accès n'a pas été régénéré."
  }
  if (!secret && safe) {
    return code
      ? `Erreur lors de la génération de l'accès client (${code}) : ${safe}`
      : `Erreur lors de la génération de l'accès client : ${safe}`
  }
  return code
    ? `Erreur lors de la génération de l'accès client (${code})`
    : "Erreur lors de la génération de l'accès client"
}

export function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let pwd = ""
  for (let i = 0; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}

export async function sendClientAccessEmail(params: {
  email: string
  tempPassword: string
  mode?: ClientAccessEmailMode
}): Promise<boolean> {
  const mode = params.mode ?? "resent"
  const subject =
    mode === "created"
      ? "Votre compte Optimum Assurance a été créé"
      : "Accès espace client — Optimum Assurance"
  const intro =
    mode === "created"
      ? "Votre compte a été créé pour accéder à votre espace client."
      : "Votre accès à l’espace client Optimum Assurance est prêt."
  const outro =
    mode === "created"
      ? "Pensez à changer votre mot de passe dès la première connexion."
      : "Merci de changer votre mot de passe dès la première connexion."

  try {
    return await sendEmail({
      to: params.email,
      subject,
      text: `Bonjour,\n\n${intro}\n\nEmail : ${params.email}\nMot de passe temporaire : ${params.tempPassword}\n\nConnexion : ${SITE_URL}/connexion\n${outro}\n\nCordialement,\nOptimum Assurance`,
      html: `<p>Bonjour,</p><p>${intro}</p><p><strong>Email :</strong> ${params.email}<br><strong>Mot de passe temporaire :</strong> ${params.tempPassword}</p><p><a href="${SITE_URL}/connexion" style="color:#2563eb;font-weight:bold">Se connecter à mon espace client</a></p><p>${outro}</p><p>Cordialement,<br>Optimum Assurance</p>`,
    })
  } catch (error) {
    console.error("[client-access] send access email failed:", error)
    return false
  }
}
