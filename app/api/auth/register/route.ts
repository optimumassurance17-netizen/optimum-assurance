import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { sendAccountCreationSummaryAlert } from "@/lib/account-creation-alert"

function optionalTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export async function POST(request: NextRequest) {
  try {
    const bodyRaw: unknown = await request.json()
    if (!bodyRaw || typeof bodyRaw !== "object" || Array.isArray(bodyRaw)) {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    const body = bodyRaw as Record<string, unknown>
    const email = optionalTrimmed(body.email)?.toLowerCase() ?? ""
    const password = typeof body.password === "string" ? body.password : ""
    const raisonSociale = optionalTrimmed(body.raisonSociale)
    const siret = optionalTrimmed(body.siret)
    const adresse = optionalTrimmed(body.adresse)
    const codePostal = optionalTrimmed(body.codePostal)
    const ville = optionalTrimmed(body.ville)
    const telephone = optionalTrimmed(body.telephone)

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Email requis et mot de passe minimum 8 caractères" },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 400 }
      )
    }

    const passwordHash = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        raisonSociale,
        siret,
        adresse,
        codePostal,
        ville,
        telephone,
      },
    })

    const template = EMAIL_TEMPLATES.bienvenue(raisonSociale ?? user.email)
    const welcomeEmailSent = await sendEmail({
      to: user.email,
      subject: template.subject,
      text: template.text,
      html: (template as { html?: string }).html,
    })
    if (!welcomeEmailSent) {
      console.warn("[auth/register] Email bienvenue non envoyé", { userId: user.id, email: user.email })
    }

    void sendAccountCreationSummaryAlert({
      source: "register_public",
      user: {
        id: user.id,
        email: user.email,
        raisonSociale: user.raisonSociale,
        siret: user.siret,
        telephone: user.telephone,
      },
      extraSummaryLines: [
        `Adresse : ${user.adresse || "—"}`,
        `Code postal : ${user.codePostal || "—"}`,
        `Ville : ${user.ville || "—"}`,
      ],
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
    })
  } catch (error) {
    console.error("Erreur inscription:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
