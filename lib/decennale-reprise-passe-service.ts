import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { extractStructuredActivities } from "@/lib/activity-hierarchy-format"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"
import { isDecennaleContractData } from "@/lib/decennale-contract-data"
import { resolveDecennaleFranchisePlafond } from "@/lib/decennale-garanties-affichage"
import { parseActivitiesJson, parseExclusionsJson } from "@/lib/insurance-contract-activities"
import {
  calendarDateInParis,
  frenchOrIsoToIso,
  isoToFrenchDate,
  repriseInstant,
  validateReprisePasseDate,
} from "@/lib/decennale-reprise-passe"

type CreatedDocument = {
  id: string
  type: string
  numero: string
  status: string
  createdAt: string
}

export type ReprisePasseResult =
  | {
      ok: true
      dateReprise: string
      dateRepriseLabel: string
      emailSent: boolean
      warning?: string
      attestation: CreatedDocument
      honneur: CreatedDocument
    }
  | { ok: false; status: number; error: string }

function parseDocumentData(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

function asCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim())
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return null
}

function documentSummary(document: {
  id: string
  type: string
  numero: string
  status: string
  createdAt: Date
}): CreatedDocument {
  return {
    id: document.id,
    type: document.type,
    numero: document.numero,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
  }
}

export async function authorizeDecennaleReprisePasse(input: {
  userId: string
  dateReprise: string
  adminEmail: string
  now?: Date
}): Promise<ReprisePasseResult> {
  const checked = validateReprisePasseDate(input.dateReprise, input.now)
  if (!checked.ok) return { ok: false, status: 400, error: checked.error }
  const dateReprise = checked.dateReprise
  const dateRepriseLabel = isoToFrenchDate(dateReprise)

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      raisonSociale: true,
      siret: true,
      adresse: true,
      codePostal: true,
      ville: true,
    },
  })
  if (!user) return { ok: false, status: 404, error: "Client introuvable." }

  const sinistreCount = await prisma.sinistre.count({ where: { userId: user.id } })
  if (sinistreCount > 0) {
    return {
      ok: false,
      status: 400,
      error: "La reprise du passé n'est pas disponible : un sinistre est déjà déclaré pour ce client.",
    }
  }

  const [contractDocuments, platformContract, attestations, honneurDocuments] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id, type: "contrat" },
      select: { id: true, numero: true, data: true, status: true, createdAt: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.insuranceContract.findFirst({
      where: { userId: user.id, productType: "decennale" },
      select: {
        id: true,
        contractNumber: true,
        clientName: true,
        siret: true,
        address: true,
        premium: true,
        activitiesJson: true,
        exclusionsJson: true,
        validFrom: true,
        validUntil: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.document.findMany({
      where: { userId: user.id, type: "attestation", status: { not: "resilie" } },
      select: { id: true, numero: true, data: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.document.findMany({
      where: { userId: user.id, type: "attestation_non_sinistralite" },
      select: { id: true, numero: true, data: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  const contractDocument =
    contractDocuments.find((document) => isDecennaleContractData(document.data)) ?? null
  if (!contractDocument && !platformContract) {
    return {
      ok: false,
      status: 400,
      error: "Aucun contrat décennale trouvé pour ce client. Créez d'abord un contrat.",
    }
  }

  const contractDataCandidate = parseDocumentData(contractDocument?.data)
  const activitiesFromDocument = extractStructuredActivities(contractDataCandidate)
  const contractData = activitiesFromDocument.length > 0 ? contractDataCandidate : {}
  const activitiesFromPlatform = parseActivitiesJson(platformContract?.activitiesJson)
  const activites = activitiesFromDocument.length ? activitiesFromDocument : activitiesFromPlatform
  if (activites.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "Impossible d'autoriser la reprise : aucune activité décennale n'est inscrite au contrat.",
    }
  }

  const originalEffectIso =
    frenchOrIsoToIso(asCleanString(contractDataCandidate.dateEffetIso)) ||
    frenchOrIsoToIso(asCleanString(contractDataCandidate.dateEffet)) ||
    (platformContract?.validFrom ? calendarDateInParis(platformContract.validFrom) : "")
  if (originalEffectIso && originalEffectIso < dateReprise) {
    return {
      ok: false,
      status: 400,
      error: `Le contrat décennale commence déjà le ${isoToFrenchDate(originalEffectIso)}, avant la date de reprise choisie.`,
    }
  }

  const endIso =
    frenchOrIsoToIso(asCleanString(contractData.dateEcheance)) ||
    frenchOrIsoToIso(asCleanString(contractDataCandidate.dateEcheance)) ||
    (platformContract?.validUntil ? calendarDateInParis(platformContract.validUntil) : "")
  if (endIso && dateReprise > endIso) {
    return {
      ok: false,
      status: 400,
      error: "La date de reprise est postérieure à la fin du contrat décennale.",
    }
  }

  const exclusionsFromDocument = extractOptimizedExclusionLines(contractData)
  const exclusionsFromPlatform = parseExclusionsJson(platformContract?.exclusionsJson)
  const exclusionsOptimisees = exclusionsFromDocument.length ? exclusionsFromDocument : exclusionsFromPlatform
  const primeAnnuelle =
    asPositiveNumber(contractData.primeAnnuelle) ?? asPositiveNumber(platformContract?.premium) ?? 0
  const montants = resolveDecennaleFranchisePlafond(contractData)
  const dateEcheance =
    asCleanString(contractData.dateEcheance) ||
    asCleanString(contractDataCandidate.dateEcheance) ||
    (platformContract?.validUntil
      ? platformContract.validUntil.toLocaleDateString("fr-FR")
      : "")
  const identity = {
    raisonSociale:
      asCleanString(contractData.raisonSociale) ||
      (user.raisonSociale || "").trim() ||
      (platformContract?.clientName || "").trim() ||
      user.email,
    siret:
      asCleanString(contractData.siret) ||
      (user.siret || "").trim() ||
      (platformContract?.siret || "").trim() ||
      "Non renseigné",
    adresse:
      asCleanString(contractData.adresse) ||
      (user.adresse || "").trim() ||
      (platformContract?.address || "").trim(),
    codePostal: asCleanString(contractData.codePostal) || (user.codePostal || "").trim(),
    ville: asCleanString(contractData.ville) || (user.ville || "").trim(),
  }
  const todayIso = calendarDateInParis(input.now ?? new Date())
  const honneurFin =
    originalEffectIso && originalEffectIso > dateReprise
      ? originalEffectIso
      : todayIso > dateReprise
        ? todayIso
        : dateReprise
  const attestationPayload = {
    ...identity,
    activites,
    exclusionsOptimisees,
    exclusionScore: contractData.exclusionScore ?? null,
    activityExclusions: exclusionsOptimisees,
    exclusions: exclusionsOptimisees,
    primeAnnuelle,
    chiffreAffaires: asPositiveNumber(contractData.chiffreAffaires) ?? undefined,
    franchise: montants.franchise,
    plafond: montants.plafond ?? undefined,
    dateEffet: dateRepriseLabel,
    dateEcheance,
    reprisePasse: true,
    dateReprisePasse: dateReprise,
    sourceContractNumero: contractDocument?.numero || platformContract?.contractNumber || null,
    generatedByAdmin: true,
    generatedAt: new Date().toISOString(),
  }
  const honneurPayload = {
    ...identity,
    dateDebut: dateReprise,
    dateFin: honneurFin,
    motif: "reprise_passe" as const,
    surHonneur: true,
  }

  const existingHonneur =
    honneurDocuments.find((document) => parseDocumentData(document.data).motif === "reprise_passe") ?? null
  const latestAttestation = attestations[0] ?? null

  const attestation = latestAttestation
    ? await prisma.document.update({
        where: { id: latestAttestation.id },
        data: {
          data: JSON.stringify({
            ...parseDocumentData(latestAttestation.data),
            ...attestationPayload,
          }),
          status: latestAttestation.status === "suspendu" ? "valide" : latestAttestation.status,
        },
        select: { id: true, type: true, numero: true, status: true, createdAt: true },
      })
    : await prisma.document.create({
        data: {
          userId: user.id,
          type: "attestation",
          numero: await getNextNumero("attestation"),
          data: JSON.stringify(attestationPayload),
          verificationToken: randomBytes(16).toString("hex"),
          status: "valide",
        },
        select: { id: true, type: true, numero: true, status: true, createdAt: true },
      })

  const honneur = existingHonneur
    ? await prisma.document.update({
        where: { id: existingHonneur.id },
        data: { data: JSON.stringify(honneurPayload), status: "valide" },
        select: { id: true, type: true, numero: true, status: true, createdAt: true },
      })
    : await prisma.document.create({
        data: {
          userId: user.id,
          type: "attestation_non_sinistralite",
          numero: await getNextNumero("attestation_non_sinistralite"),
          data: JSON.stringify(honneurPayload),
          status: "valide",
        },
        select: { id: true, type: true, numero: true, status: true, createdAt: true },
      })

  if (contractDocument) {
    await prisma.document.update({
      where: { id: contractDocument.id },
      data: {
        data: JSON.stringify({
          ...parseDocumentData(contractDocument.data),
          reprisePasse: true,
          dateReprisePasse: dateReprise,
          dateEffet: dateRepriseLabel,
          dateEffetIso: dateReprise,
        }),
      },
    })
  }
  if (platformContract) {
    await prisma.insuranceContract.update({
      where: { id: platformContract.id },
      data: { validFrom: repriseInstant(dateReprise) },
    })
  }

  const template = EMAIL_TEMPLATES.reprisePasseDecennale(identity.raisonSociale, dateRepriseLabel, attestation.numero)
  const emailSent = await sendEmail({
    to: user.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  })

  await logAdminActivity({
    adminEmail: input.adminEmail,
    action: "reprise_passe_autorisee",
    targetType: "user",
    targetId: user.id,
    details: {
      dateReprise,
      attestationNumero: attestation.numero,
      honneurNumero: honneur.numero,
      emailSent,
    },
  })

  return {
    ok: true,
    dateReprise,
    dateRepriseLabel,
    emailSent,
    ...(emailSent
      ? {}
      : { warning: "Reprise enregistrée, mais l'e-mail client n'a pas été envoyé." }),
    attestation: documentSummary(attestation),
    honneur: documentSummary(honneur),
  }
}
