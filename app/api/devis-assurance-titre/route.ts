import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email"
import { sendNewDevisRequestAlert } from "@/lib/devis-alert"
import { getClientIp, checkRateLimitMemory } from "@/lib/rate-limit"
import {
  ASSURANCE_TITRE_BESOIN_LABELS,
  ASSURANCE_TITRE_BIEN_LABELS,
  ASSURANCE_TITRE_OPERATION_LABELS,
  ASSURANCE_TITRE_PROFIL_LABELS,
  ASSURANCE_TITRE_RISQUE_LABELS,
  type AssuranceTitreBesoinPrincipal,
  type AssuranceTitreData,
  type AssuranceTitreProfilSouscripteur,
  type AssuranceTitreRisqueIdentifie,
  type AssuranceTitreTypeBien,
  type AssuranceTitreTypeOperation,
} from "@/lib/assurance-titre-types"
import {
  buildConversionTrackingLines,
  hasConversionTrackingContext,
  type ConversionTrackingContext,
} from "@/lib/conversion-tracking"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const PROFIL_SET = new Set<AssuranceTitreProfilSouscripteur>(
  Object.keys(ASSURANCE_TITRE_PROFIL_LABELS) as AssuranceTitreProfilSouscripteur[]
)
const OPERATION_SET = new Set<AssuranceTitreTypeOperation>(
  Object.keys(ASSURANCE_TITRE_OPERATION_LABELS) as AssuranceTitreTypeOperation[]
)
const BIEN_SET = new Set<AssuranceTitreTypeBien>(
  Object.keys(ASSURANCE_TITRE_BIEN_LABELS) as AssuranceTitreTypeBien[]
)
const BESOIN_SET = new Set<AssuranceTitreBesoinPrincipal>(
  Object.keys(ASSURANCE_TITRE_BESOIN_LABELS) as AssuranceTitreBesoinPrincipal[]
)
const RISQUE_SET = new Set<AssuranceTitreRisqueIdentifie>(
  Object.keys(ASSURANCE_TITRE_RISQUE_LABELS) as AssuranceTitreRisqueIdentifie[]
)

function normalize(value: unknown, maxLength = 250): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function normalizeSiret(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 14) : ""
}

function sanitizeTracking(value: unknown): ConversionTrackingContext | undefined {
  if (!value || typeof value !== "object") return undefined
  const tracking = value as Record<string, unknown>

  const sanitized: ConversionTrackingContext = {
    utmSource: normalize(tracking.utmSource, 120) || undefined,
    utmMedium: normalize(tracking.utmMedium, 120) || undefined,
    utmCampaign: normalize(tracking.utmCampaign, 120) || undefined,
    entryPath: normalize(tracking.entryPath, 240) || undefined,
    referrer: normalize(tracking.referrer, 500) || undefined,
  }

  return hasConversionTrackingContext(sanitized) ? sanitized : undefined
}

function sanitizePayload(
  body: unknown
): { email: string; data: AssuranceTitreData; tracking?: ConversionTrackingContext } | null {
  if (!body || typeof body !== "object") return null
  const payload = body as Record<string, unknown>

  const email = normalize(payload.email, 160).toLowerCase()
  if (!EMAIL_RE.test(email)) return null

  const rawData = payload.data
  if (!rawData || typeof rawData !== "object") return null
  const dataObj = rawData as Record<string, unknown>

  const nomComplet = normalize(dataObj.nomComplet)
  const raisonSociale = normalize(dataObj.raisonSociale)
  const siret = normalizeSiret(dataObj.siret)
  const telephone = normalize(dataObj.telephone, 40)
  const adresseBien = normalize(dataObj.adresseBien, 250)
  const codePostalBien = normalize(dataObj.codePostalBien, 20)
  const villeBien = normalize(dataObj.villeBien, 120)
  const message = normalize(dataObj.message, 4000)
  const dateSignaturePrevue = normalize(dataObj.dateSignaturePrevue, 20)

  const profilRaw = normalize(dataObj.profilSouscripteur, 60)
  const operationRaw = normalize(dataObj.typeOperation, 60)
  const bienRaw = normalize(dataObj.typeBien, 60)
  const besoinRaw = normalize(dataObj.besoinPrincipal, 60)

  if (!nomComplet || !telephone || !adresseBien || !codePostalBien || !villeBien) return null
  if (siret && !/^\d{14}$/.test(siret)) return null
  if (dateSignaturePrevue && !DATE_RE.test(dateSignaturePrevue)) return null

  if (
    !PROFIL_SET.has(profilRaw as AssuranceTitreProfilSouscripteur) ||
    !OPERATION_SET.has(operationRaw as AssuranceTitreTypeOperation) ||
    !BIEN_SET.has(bienRaw as AssuranceTitreTypeBien) ||
    !BESOIN_SET.has(besoinRaw as AssuranceTitreBesoinPrincipal)
  ) {
    return null
  }

  const montantOperationRaw = dataObj.montantOperation
  const montantOperation =
    typeof montantOperationRaw === "number"
      ? montantOperationRaw
      : Number.parseFloat(String(montantOperationRaw ?? ""))
  if (!Number.isFinite(montantOperation) || montantOperation <= 0) return null

  const risquesIdentifies = Array.isArray(dataObj.risquesIdentifies)
    ? Array.from(
        new Set(
          dataObj.risquesIdentifies
            .map((risk) => normalize(risk, 60))
            .filter((risk): risk is AssuranceTitreRisqueIdentifie =>
              RISQUE_SET.has(risk as AssuranceTitreRisqueIdentifie)
            )
        )
      )
    : []

  if (besoinRaw === "anomalie_identifiee" && message.length < 20) return null

  const data: AssuranceTitreData = {
    nomComplet,
    telephone,
    profilSouscripteur: profilRaw as AssuranceTitreProfilSouscripteur,
    typeOperation: operationRaw as AssuranceTitreTypeOperation,
    typeBien: bienRaw as AssuranceTitreTypeBien,
    besoinPrincipal: besoinRaw as AssuranceTitreBesoinPrincipal,
    adresseBien,
    codePostalBien,
    villeBien,
    montantOperation,
    financementExterne:
      dataObj.financementExterne === true ||
      dataObj.financementExterne === "true" ||
      dataObj.financementExterne === 1,
    risquesIdentifies,
    ...(raisonSociale ? { raisonSociale } : {}),
    ...(siret ? { siret } : {}),
    ...(dateSignaturePrevue ? { dateSignaturePrevue } : {}),
    ...(message ? { message } : {}),
  }

  return {
    email,
    data,
    tracking: sanitizeTracking(payload.tracking),
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { ok, retryAfterSec } = checkRateLimitMemory(`devis-assurance-titre:${ip}`, 5, 60_000)
  if (!ok) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez dans une minute." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
  }

  const parsed = sanitizePayload(body)
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Données invalides : vérifiez l'e-mail, le contact, le type d'opération, le bien, l'adresse et le montant déclaré.",
      },
      { status: 400 }
    )
  }

  const { email, data, tracking } = parsed
  const storedPayload = {
    ...data,
    ...(tracking ? { tracking } : {}),
  }

  try {
    await prisma.devisAssuranceTitreLead.create({
      data: {
        email,
        data: JSON.stringify(storedPayload),
      },
    })
  } catch (error) {
    console.error("[devis-assurance-titre] prisma:", error)
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 })
  }

  try {
    const session = await getServerSession(authOptions)
    const emailNorm = email.trim().toLowerCase()
    if (session?.user?.id && session.user.email?.trim().toLowerCase() === emailNorm) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          titleInitialQuestionnaireJson: JSON.stringify(storedPayload),
          raisonSociale: data.raisonSociale?.trim() || data.nomComplet,
          ...(data.siret ? { siret: data.siret } : {}),
          telephone: data.telephone,
        },
      })
    }
  } catch (error) {
    console.error("[devis-assurance-titre] save user initial JSON:", error)
  }

  const lines: string[] = [
    `Interlocuteur : ${data.nomComplet}`,
    ...(data.raisonSociale ? [`Société / structure : ${data.raisonSociale}`] : []),
    ...(data.siret ? [`SIRET : ${data.siret}`] : []),
    `Téléphone : ${data.telephone}`,
    `Profil : ${ASSURANCE_TITRE_PROFIL_LABELS[data.profilSouscripteur]}`,
    `Opération : ${ASSURANCE_TITRE_OPERATION_LABELS[data.typeOperation]}`,
    `Type de bien : ${ASSURANCE_TITRE_BIEN_LABELS[data.typeBien]}`,
    `Besoin principal : ${ASSURANCE_TITRE_BESOIN_LABELS[data.besoinPrincipal]}`,
    `Bien : ${data.adresseBien}, ${data.codePostalBien} ${data.villeBien}`,
    `Montant de l'opération : ${data.montantOperation.toLocaleString("fr-FR")} €`,
    `Financement / prêteur impliqué : ${data.financementExterne ? "oui" : "non"}`,
  ]

  if (data.dateSignaturePrevue) {
    lines.push(`Date cible de signature : ${data.dateSignaturePrevue}`)
  }
  if (data.risquesIdentifies.length > 0) {
    lines.push(
      `Points de vigilance : ${data.risquesIdentifies.map((risk) => ASSURANCE_TITRE_RISQUE_LABELS[risk]).join(", ")}`
    )
  }
  if (data.message) {
    lines.push(`Précisions : ${data.message}`)
  }
  lines.push(...buildConversionTrackingLines(tracking))

  try {
    await sendNewDevisRequestAlert({
      type: "assurance_titre",
      clientEmail: email,
      lines,
    })
  } catch (error) {
    console.error("[devis-assurance-titre] alerte interne:", error)
  }

  try {
    const template = EMAIL_TEMPLATES.demandeAssuranceTitreRecue(data.nomComplet)
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })
    if (!sent) {
      console.error("[devis-assurance-titre] email prospect: envoi impossible")
    }
  } catch (error) {
    console.error("[devis-assurance-titre] email prospect:", error)
  }

  return NextResponse.json({ ok: true })
}
