import { sendEmail } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"

export type ClientAccessEmailMode = "created" | "resent"

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
