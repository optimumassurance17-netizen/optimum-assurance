import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { hash } from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { logAdminActivity } from "@/lib/admin-activity"
import { sendAccountCreationSummaryAlert } from "@/lib/account-creation-alert"
import { extractClientIdentityFromRecord, mergeClientIdentity } from "@/lib/client-identity-extract"
import { generateTempPassword, sendClientAccessEmail } from "@/lib/client-access"

type SupportedLeadType =
  | "dommage_ouvrage"
  | "rc_fabriquant"
  | "decennale"
  | "etude"
  | "assurance_titre"

function normalizeLeadType(raw: string): SupportedLeadType {
  if (["rc_fabriquant", "rc-fabriquant", "rc fabricant", "rc_fabricant"].includes(raw)) {
    return "rc_fabriquant"
  }
  if (["assurance_titre", "assurance-titre", "titre", "title"].includes(raw)) {
    return "assurance_titre"
  }
  if (["decennale", "décennale", "devis_decennale", "devis-décennale"].includes(raw)) {
    return "decennale"
  }
  if (["etude", "étude", "devis_etude", "devis-étude"].includes(raw)) {
    return "etude"
  }
  return "dommage_ouvrage"
}

function parseLeadData(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function isSchemaDriftError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  )
}

const USER_CREATE_SELECT = {
  id: true,
  email: true,
  raisonSociale: true,
} as const

type CreateLeadUserParams = {
  email: string
  passwordHash: string
  raisonSociale: string
  siret: string | null
  telephone: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  doInitialQuestionnaireJson?: string
  titleInitialQuestionnaireJson?: string
}

async function createLeadUserWithSchemaFallback(params: CreateLeadUserParams) {
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
  const questionnaireData = {
    ...(params.doInitialQuestionnaireJson
      ? { doInitialQuestionnaireJson: params.doInitialQuestionnaireJson }
      : {}),
    ...(params.titleInitialQuestionnaireJson
      ? { titleInitialQuestionnaireJson: params.titleInitialQuestionnaireJson }
      : {}),
  }

  const attempts = [
    { label: "full", data: { ...baseData, ...identityData, ...questionnaireData } },
    {
      label: "without-title-questionnaire",
      data: {
        ...baseData,
        ...identityData,
        ...(params.doInitialQuestionnaireJson
          ? { doInitialQuestionnaireJson: params.doInitialQuestionnaireJson }
          : {}),
      },
    },
    { label: "without-questionnaires", data: { ...baseData, ...identityData } },
    { label: "minimal", data: baseData },
  ] as const

  let lastSchemaError: unknown = null
  for (const attempt of attempts) {
    try {
      const user = await prisma.user.create({
        data: attempt.data,
        select: USER_CREATE_SELECT,
      })
      return { user, usedFallback: attempt.label !== "full" }
    } catch (error) {
      if (!isSchemaDriftError(error)) throw error
      lastSchemaError = error
      console.warn("[gestion/users/create-from-lead] schema drift fallback:", attempt.label)
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
    const payload = body as { leadId?: unknown; leadType?: unknown }
    const leadId = typeof payload.leadId === "string" ? payload.leadId.trim() : ""
    const leadTypeRaw = typeof payload.leadType === "string" ? payload.leadType.trim().toLowerCase() : ""
    const leadType = normalizeLeadType(leadTypeRaw)

    if (!leadId) {
      return NextResponse.json({ error: "leadId requis" }, { status: 400 })
    }

    const lead =
      leadType === "rc_fabriquant"
        ? await prisma.devisRcFabriquantLead.findUnique({
            where: { id: leadId },
            select: { id: true, email: true, data: true },
          })
        : leadType === "assurance_titre"
          ? await prisma.devisAssuranceTitreLead.findUnique({
              where: { id: leadId },
              select: { id: true, email: true, data: true },
            })
        : leadType === "decennale"
          ? await prisma.devisLead.findUnique({
              where: { id: leadId },
              select: { id: true, email: true, raisonSociale: true, siret: true },
            })
          : leadType === "etude"
            ? await prisma.devisEtudeLead.findUnique({
                where: { id: leadId },
                select: { id: true, email: true, data: true, raisonSociale: true, siret: true },
              })
            : await prisma.devisDommageOuvrageLead.findUnique({
                where: { id: leadId },
                select: { id: true, email: true, data: true },
              })

    if (!lead) {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }

    const normalizedEmail = lead.email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        raisonSociale: true,
      },
    })

    if (existing) {
      const tempPassword = generateTempPassword()
      const passwordHash = await hash(tempPassword, 12)
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash },
      })

      const sent = await sendClientAccessEmail({
        email: existing.email,
        tempPassword,
        mode: "resent",
      })
      if (!sent) {
        return NextResponse.json(
          {
            error:
              "Compte existant détecté, mais envoi de l'accès client impossible (RESEND_API_KEY / domaine expéditeur).",
            userId: existing.id,
            email: existing.email,
          },
          { status: 503 }
        )
      }

      await logAdminActivity({
        adminEmail: session.user.email || "admin",
        action: "user_create_from_lead_existing_access_sent",
        targetType: "user",
        targetId: existing.id,
        details: {
          email: existing.email,
          leadId,
          leadType,
        },
      })

      return NextResponse.json({
        id: existing.id,
        email: existing.email,
        raisonSociale: existing.raisonSociale,
        accessMode: "resent",
      })
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await hash(tempPassword, 12)

    const leadData = "data" in lead ? parseLeadData(lead.data) : {}
    const leadIdentity = mergeClientIdentity(
      extractClientIdentityFromRecord(leadData),
      extractClientIdentityFromRecord({
        raisonSociale: "raisonSociale" in lead ? lead.raisonSociale : null,
        siret: "siret" in lead ? lead.siret : null,
        email: lead.email,
      })
    )
    const raisonSociale = leadIdentity.raisonSociale
    const siret = leadIdentity.siret ?? null
    const telephone = leadIdentity.telephone ?? null
    const adresse = leadIdentity.adresse ?? null
    const codePostal = leadIdentity.codePostal ?? null
    const ville = leadIdentity.ville ?? null

    const { user, usedFallback } = await createLeadUserWithSchemaFallback({
      email: normalizedEmail,
      passwordHash,
      raisonSociale: raisonSociale || normalizedEmail,
      siret,
      telephone,
      adresse,
      codePostal,
      ville,
      ...(leadType === "dommage_ouvrage" && "data" in lead
        ? { doInitialQuestionnaireJson: lead.data }
        : {}),
      ...(leadType === "assurance_titre" && "data" in lead
        ? { titleInitialQuestionnaireJson: lead.data }
        : {}),
    })

    const sent = await sendClientAccessEmail({
      email: user.email,
      tempPassword,
      mode: "created",
    })
    if (!sent) {
      await logAdminActivity({
        adminEmail: session.user.email || "admin",
        action: "user_create_from_lead_access_email_failed",
        targetType: "user",
        targetId: user.id,
        details: {
          email: user.email,
          leadId,
          leadType,
        },
      })

      return NextResponse.json({
        id: user.id,
        email: user.email,
        raisonSociale: user.raisonSociale,
        accessMode: "created",
        emailSent: false,
        warning:
          "Compte créé, mais email d'accès non envoyé. Utilisez ensuite 'Créer / renvoyer accès client' depuis la fiche client ou la gestion.",
      })
    }

    const accountCreationAlertSent = await sendAccountCreationSummaryAlert({
      source: "admin_create_from_lead",
      createdBy: session.user.email || "admin",
      leadType,
      leadId,
      user: {
        id: user.id,
        email: user.email,
        raisonSociale: user.raisonSociale,
        siret: siret || undefined,
        telephone: telephone || undefined,
      },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "user_create_from_lead",
      targetType: "user",
      targetId: user.id,
      details: {
        email: user.email,
        leadId,
        leadType,
        accountCreationAlertSent,
        usedSchemaFallback: usedFallback,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      raisonSociale: user.raisonSociale,
      accessMode: "created",
      emailSent: true,
    })
  } catch (error) {
    console.error("Erreur création compte depuis lead:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
