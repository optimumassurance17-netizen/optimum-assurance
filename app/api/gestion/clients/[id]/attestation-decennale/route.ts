import { randomBytes } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { getNextNumero } from "@/lib/documents"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import { extractStructuredActivities } from "@/lib/activity-hierarchy-format"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"
import {
  parseActivitiesJson,
  parseExclusionsJson,
} from "@/lib/insurance-contract-activities"

function generateVerificationToken(): string {
  return randomBytes(16).toString("hex")
}

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

function formatDateFr(value: Date | null | undefined): string {
  if (!value) return new Date().toLocaleDateString("fr-FR")
  return value.toLocaleDateString("fr-FR")
}

/**
 * Admin (fiche client) : génère une attestation décennale et notifie le client.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
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
    if (!user) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 })
    }

    const [latestContractDocument, latestDecennaleContract] = await Promise.all([
      prisma.document.findFirst({
        where: {
          userId: id,
          type: "contrat",
        },
        select: {
          id: true,
          numero: true,
          data: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.insuranceContract.findFirst({
        where: {
          userId: id,
          productType: "decennale",
        },
        select: {
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
    ])

    if (!latestContractDocument && !latestDecennaleContract) {
      return NextResponse.json(
        {
          error:
            "Aucun contrat décennale trouvé pour ce client. Créez/validez d'abord un contrat.",
        },
        { status: 400 }
      )
    }

    const contractDataCandidate = parseDocumentData(latestContractDocument?.data)
    const activitiesFromDocument = extractStructuredActivities(contractDataCandidate)
    const contractData = activitiesFromDocument.length > 0 ? contractDataCandidate : {}
    const activitiesFromPlatform = parseActivitiesJson(
      latestDecennaleContract?.activitiesJson
    )
    const activites = activitiesFromDocument.length
      ? activitiesFromDocument
      : activitiesFromPlatform

    if (activites.length === 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de générer l'attestation : aucune activité décennale exploitable trouvée sur le contrat.",
        },
        { status: 400 }
      )
    }

    const exclusionsFromDocument = extractOptimizedExclusionLines(contractData)
    const exclusionsFromPlatform = parseExclusionsJson(
      latestDecennaleContract?.exclusionsJson
    )
    const exclusionsOptimisees = exclusionsFromDocument.length
      ? exclusionsFromDocument
      : exclusionsFromPlatform

    const numero = await getNextNumero("attestation")
    const primeAnnuelle =
      asPositiveNumber(contractData.primeAnnuelle) ??
      asPositiveNumber(latestDecennaleContract?.premium) ??
      0

    const payload = {
      raisonSociale:
        asCleanString(contractData.raisonSociale) ||
        (user.raisonSociale || "").trim() ||
        (latestDecennaleContract?.clientName || "").trim() ||
        user.email,
      siret:
        asCleanString(contractData.siret) ||
        (user.siret || "").trim() ||
        (latestDecennaleContract?.siret || "").trim() ||
        "Non renseigné",
      adresse:
        asCleanString(contractData.adresse) ||
        (user.adresse || "").trim() ||
        (latestDecennaleContract?.address || "").trim(),
      codePostal:
        asCleanString(contractData.codePostal) || (user.codePostal || "").trim(),
      ville: asCleanString(contractData.ville) || (user.ville || "").trim(),
      activites,
      exclusionsOptimisees,
      exclusionScore: contractData.exclusionScore ?? null,
      activityExclusions: exclusionsOptimisees,
      exclusions: exclusionsOptimisees,
      primeAnnuelle,
      dateEffet:
        asCleanString(contractData.dateEffet) ||
        formatDateFr(latestDecennaleContract?.validFrom),
      dateEcheance:
        asCleanString(contractData.dateEcheance) ||
        formatDateFr(latestDecennaleContract?.validUntil),
      sourceContractNumero:
        (activitiesFromDocument.length > 0 ? latestContractDocument?.numero : null) ||
        latestDecennaleContract?.contractNumber ||
        null,
      generatedByAdmin: true,
      generatedAt: new Date().toISOString(),
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "attestation",
        numero,
        data: JSON.stringify(payload),
        verificationToken: generateVerificationToken(),
        status: "valide",
      },
      select: {
        id: true,
        numero: true,
        type: true,
        status: true,
        createdAt: true,
      },
    })

    const template = EMAIL_TEMPLATES.attestationDecennaleDisponible(
      user.raisonSociale || user.email,
      document.numero
    )
    const emailSent = await sendEmail({
      to: user.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
      replyTo: session.user.email || undefined,
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "attestation_decennale_generated_by_admin",
      targetType: "document",
      targetId: document.id,
      details: {
        userId: user.id,
        numero: document.numero,
        sourceContractNumero: payload.sourceContractNumero,
        emailSent,
      },
    })

    return NextResponse.json({
      ok: true,
      emailSent,
      ...(emailSent
        ? {}
        : {
            warning:
              "Attestation créée, mais email non envoyé (vérifiez RESEND_API_KEY / EMAIL_FROM).",
          }),
      document,
    })
  } catch (error) {
    console.error("[gestion/clients/:id/attestation-decennale] POST", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération de l'attestation décennale." },
      { status: 500 }
    )
  }
}
