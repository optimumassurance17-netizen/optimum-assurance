import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { ContratPDF } from "@/components/pdf/ContratPDF"
import { getNextNumero } from "@/lib/documents"
import { prisma } from "@/lib/prisma"
import { FRANCHISE_DECENNALE_EUR } from "@/lib/tarification"
import { uploadPdfAndInsertSignRequest } from "@/lib/esign/upload-pdf-and-insert-sign-request"
import { resolveUserActivitiesHierarchy } from "@/lib/activity-hierarchy"
import { generateOptimizedExclusions } from "@/lib/optimized-exclusions"
import { assertRecentDdaConsent } from "@/lib/dda-compliance"

export const runtime = "nodejs"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function asOptionalTrimmedString(value: unknown): string | undefined {
  return asTrimmedString(value) ?? undefined
}

function asNonNegativeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim()
    if (!normalized) return fallback
    const parsed = Number(normalized)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return fallback
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

/** Décennale : PDF contrat + ligne `sign_requests` (Supabase) + `pendingSignature`. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
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
    const rawBody = body as Record<string, unknown>
    const souscription = rawBody.souscription
    if (!souscription || typeof souscription !== "object") {
      return NextResponse.json(
        { error: "Données de souscription incomplètes" },
        { status: 400 }
      )
    }
    const rawSouscription = souscription as Record<string, unknown>
    const insuranceProductRaw = asTrimmedString(rawSouscription.insuranceProduct)?.toLowerCase()
    if (insuranceProductRaw === "do" || insuranceProductRaw === "dommage-ouvrage") {
      return NextResponse.json(
        {
          error:
            "Ce parcours de signature est réservé à la décennale. Pour le dommage-ouvrage, utilisez le contrat plateforme depuis l'espace client.",
        },
        { status: 400 }
      )
    }
    const raisonSociale = asTrimmedString(rawSouscription.raisonSociale)
    const email = asTrimmedString(rawSouscription.email)?.toLowerCase()
    const representantLegal = asTrimmedString(rawSouscription.representantLegal)
    if (!raisonSociale || !email || !EMAIL_RE.test(email) || !representantLegal) {
      return NextResponse.json(
        { error: "Données de souscription incomplètes" },
        { status: 400 }
      )
    }

    const tarif =
      rawSouscription.tarif && typeof rawSouscription.tarif === "object"
        ? (rawSouscription.tarif as Record<string, unknown>)
        : {}
    const primeAnnuelle = asNonNegativeNumber(tarif.primeAnnuelle, 0)
    const primeMensuelle = asNonNegativeNumber(tarif.primeMensuelle, 0)
    const primeTrimestrielleRaw = asNonNegativeNumber(tarif.primeTrimestrielle, -1)
    const primeTrimestrielle =
      primeTrimestrielleRaw >= 0
        ? primeTrimestrielleRaw
        : primeAnnuelle > 0
          ? Math.round((primeAnnuelle / 4) * 100) / 100
          : undefined
    const activites = Array.isArray(rawSouscription.activites)
      ? rawSouscription.activites
          .filter((value): value is string => typeof value === "string")
          .map((activity) => activity.trim())
          .filter((activity) => activity.length > 0)
          .slice(0, 50)
      : []
    const hierarchy = await resolveUserActivitiesHierarchy(activites, {
      userId: session.user.id,
    })
    if (!hierarchy.guaranteedActivitiesFlat.length) {
      return NextResponse.json(
        {
          error:
            "Aucune activité ne correspond à la nomenclature officielle. Merci de préciser vos activités.",
          unmatchedActivities: hierarchy.unmatched,
          nomenclatureAlerts: hierarchy.unmatched.map(
            (item) =>
              `Activité hors nomenclature: ${item.input}${
                item.suggestedActivity
                  ? ` (suggestion: ${item.suggestedActivity.code} ${item.suggestedActivity.name})`
                  : ""
              }`
          ),
        },
        { status: 400 }
      )
    }
    const matchedActivities = hierarchy.guaranteedActivitiesFlat
    const optimizedExclusions = generateOptimizedExclusions(
      hierarchy.guaranteedHierarchyLines.length ? hierarchy.guaranteedHierarchyLines : matchedActivities,
      { selections: hierarchy.selections }
    )

    const ddaConsent = await assertRecentDdaConsent({
      userId: session.user.id,
      produit: "decennale",
      maxAgeHours: 72,
      allowedPages: ["signature", "souscription"],
    })
    if (!ddaConsent.ok) {
      return NextResponse.json(
        {
          error:
            "Validation DDA manquante ou expirée. Merci de confirmer à nouveau vos exigences et besoins avant signature.",
          code: "DDA_CONSENT_REQUIRED",
        },
        { status: 412 }
      )
    }
    const existingPending = await prisma.pendingSignature.findFirst({
      where: { userId: session.user.id },
    })
    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "Une demande de signature est déjà en attente pour ce dossier. Finalisez-la ou annulez-la avant d'en créer une nouvelle.",
        },
        { status: 409 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const now = new Date()
    const dateEffet = now.toLocaleDateString("fr-FR")
    const dateEffetIso = now.toISOString().split("T")[0]
    const dateEcheance = new Date(now.getFullYear(), 11, 31).toLocaleDateString("fr-FR")

    const baseContract = {
      numero: await getNextNumero("contrat"),
      raisonSociale,
      siret: asOptionalTrimmedString(rawSouscription.siret) || "",
      adresse: asOptionalTrimmedString(rawSouscription.adresse),
      codePostal: asOptionalTrimmedString(rawSouscription.codePostal),
      ville: asOptionalTrimmedString(rawSouscription.ville),
      representantLegal,
      civilite: asOptionalTrimmedString(rawSouscription.civilite),
      activites: hierarchy.guaranteedHierarchyLines,
      activitesNormalisees: matchedActivities,
      activitesHorsNomenclature: hierarchy.unmatched.map((item) => item.input),
      alertsNomenclature: hierarchy.unmatched.map(
        (item) =>
          `Activité hors nomenclature: ${item.input}${
            item.suggestedActivity
              ? ` (suggestion: ${item.suggestedActivity.code} ${item.suggestedActivity.name})`
              : ""
          }`
      ),
      confidenceNomenclature: hierarchy.confidence,
      exclusionsOptimisees: optimizedExclusions.lines,
      exclusionScore: optimizedExclusions.score,
      chiffreAffaires: asNonNegativeNumber(rawSouscription.chiffreAffaires, 0),
      primeAnnuelle,
      primeMensuelle: primeMensuelle > 0 ? primeMensuelle : undefined,
      primeTrimestrielle,
      modePaiement: "prelevement",
      periodicitePrelevement: "trimestriel",
      fraisGestionPrelevement: 60,
      // Règle métier: décennale = franchise fixe 1 000 € pour toutes activités.
      franchise: FRANCHISE_DECENNALE_EUR,
      plafond: asNonNegativeNumber(tarif.plafond, 100000),
      dateEffet,
      dateEffetIso,
      dateEcheance,
      jamaisAssure: asOptionalBoolean(rawSouscription.jamaisAssure),
      reprisePasse: asOptionalBoolean(rawSouscription.reprisePasse),
      dateCreationSociete: asOptionalTrimmedString(rawSouscription.dateCreationSociete),
    }

    const contractData = { ...baseContract, signatureProvider: "supabase" as const }

    const pdfElement = React.createElement(ContratPDF, {
      numero: baseContract.numero,
      data: baseContract,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = Buffer.from(await renderToBuffer(pdfElement as any))

    const folder = randomUUID()
    const storagePath = `souscription/decennale/${folder}/contrat-${baseContract.numero}.pdf`

    const { id: signRequestId } = await uploadPdfAndInsertSignRequest(pdfBuffer, storagePath)

    await prisma.pendingSignature.create({
      data: {
        signatureRequestId: signRequestId,
        userId: session.user.id,
        contractData: JSON.stringify(contractData),
        contractNumero: baseContract.numero,
      },
    })

    const nextPath = "/mandat-sepa"
    const signatureLink = `${baseUrl}/sign/${signRequestId}?next=${encodeURIComponent(nextPath)}`

    return NextResponse.json({
      signatureRequestId: signRequestId,
      signatureLink,
      contractNumero: contractData.numero,
      contractData,
    })
  } catch (error) {
    console.error("[api/sign/create-request]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur lors de la création de la signature",
      },
      { status: 500 }
    )
  }
}
