import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@/lib/prisma-client"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import {
  duplicateSiretAccountMessage,
  findClientByEmail,
  findClientBySiret,
  normalizeAccountEmail,
  normalizeAccountSiret,
} from "@/lib/client-account"
import {
  clientAccessErrorMessage,
  generateTempPassword,
  hashTemporaryPassword,
  sendClientAccessEmail,
} from "@/lib/client-access"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function textField(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

function isSchemaDriftError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  )
}

async function createClientRecord(params: {
  email: string
  passwordHash: string
  raisonSociale: string
  siret: string | null
  telephone: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
}) {
  const baseData = {
    email: params.email,
    passwordHash: params.passwordHash,
    raisonSociale: params.raisonSociale,
  }
  const identityData = {
    ...(params.siret ? { siret: params.siret } : {}),
    ...(params.telephone ? { telephone: params.telephone } : {}),
    ...(params.adresse ? { adresse: params.adresse } : {}),
    ...(params.codePostal ? { codePostal: params.codePostal } : {}),
    ...(params.ville ? { ville: params.ville } : {}),
  }
  const attempts = [
    { label: "full", data: { ...baseData, ...identityData } },
    { label: "minimal", data: baseData },
  ] as const

  let lastSchemaError: unknown = null
  for (const attempt of attempts) {
    try {
      const user = await prisma.user.create({
        data: attempt.data,
        select: { id: true, email: true, raisonSociale: true },
      })
      return { user, usedFallback: attempt.label !== "full" }
    } catch (error) {
      if (!isSchemaDriftError(error)) throw error
      lastSchemaError = error
      console.warn("[gestion/clients/create] schema drift fallback:", attempt.label)
    }
  }

  throw lastSchemaError ?? new Error("Création utilisateur impossible")
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Objet JSON attendu" }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const email = normalizeAccountEmail(textField(payload.email, 254))
    const raisonSociale = textField(payload.raisonSociale, 180)
    const siretRaw = textField(payload.siret, 32)
    const telephone = textField(payload.telephone, 30) || null
    const adresse = textField(payload.adresse, 300) || null
    const codePostal = textField(payload.codePostal, 12) || null
    const ville = textField(payload.ville, 100) || null

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email client invalide" }, { status: 400 })
    }
    if (!raisonSociale) {
      return NextResponse.json({ error: "La raison sociale est requise" }, { status: 400 })
    }

    const siret = siretRaw ? normalizeAccountSiret(siretRaw) : null
    if (siretRaw && !siret) {
      return NextResponse.json({ error: "Le SIRET doit contenir 14 chiffres" }, { status: 400 })
    }

    const existing = await findClientByEmail(email)
    if (existing) {
      await logAdminActivity({
        adminEmail: session.user.email || "admin",
        action: "user_create_existing_kept",
        targetType: "user",
        targetId: existing.id,
        details: { email: existing.email },
      })
      return NextResponse.json(
        {
          existing: true,
          id: existing.id,
          email: existing.email,
          raisonSociale: existing.raisonSociale,
          error:
            "Un compte client existe déjà pour cet email. Le mot de passe n'a pas été changé. Choisissez ce client dans le devis.",
        },
        { status: 409 }
      )
    }

    const sameSiret = await findClientBySiret(siret)
    if (sameSiret && sameSiret.email.trim().toLowerCase() !== email) {
      return NextResponse.json({ error: duplicateSiretAccountMessage(sameSiret.email) }, { status: 409 })
    }

    const tempPassword = generateTempPassword()
    const passwordHash = hashTemporaryPassword(tempPassword)
    const { user, usedFallback } = await createClientRecord({
      email,
      passwordHash,
      raisonSociale,
      siret,
      telephone,
      adresse,
      codePostal,
      ville,
    })

    const sent = await sendClientAccessEmail({
      email: user.email,
      tempPassword,
      mode: "created",
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: sent ? "user_created_from_gestion" : "user_created_from_gestion_email_failed",
      targetType: "user",
      targetId: user.id,
      details: {
        email: user.email,
        raisonSociale: user.raisonSociale,
        siret: siret ?? undefined,
        usedSchemaFallback: usedFallback,
      },
    })

    if (!sent) {
      return NextResponse.json({
        id: user.id,
        email: user.email,
        raisonSociale: user.raisonSociale,
        siret,
        accessMode: "created",
        emailSent: false,
        temporaryPassword: tempPassword,
        warning:
          "Compte client créé, mais l'email d'accès n'est pas parti. Copiez le mot de passe temporaire et transmettez-le au client.",
      })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      raisonSociale: user.raisonSociale,
      siret,
      accessMode: "created",
      emailSent: true,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Un compte client existe déjà pour cet email. Le mot de passe n'a pas été changé. Choisissez ce client dans le devis.",
        },
        { status: 409 }
      )
    }
    console.error("Erreur création compte client depuis la gestion:", error)
    return NextResponse.json({ error: clientAccessErrorMessage(error) }, { status: 500 })
  }
}
