import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { uploadPdfAndInsertSignRequest } from "@/lib/esign/upload-pdf-and-insert-sign-request"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { logAdminActivity } from "@/lib/admin-activity"
import {
  buildRcFabDossierConfig,
  normalizeRcFabPeriodicity,
  serializeRcFabDossierConfig,
} from "@/lib/rc-fabriquant-dossier-config"
import { runSignatureQualityGates, type SignatureQualityGatePayload } from "@/lib/signature-quality-gates"
import { generateRcFabBatteriesQuotePdf } from "@/lib/pdf/rc-fabriquant/generateDossier"
import { normalizeRcFabriquantLeadStatut } from "@/lib/rc-fabriquant-lead-statuts"

export const runtime = "nodejs"

function normalizeNextPath(raw: string | null): string {
  const fallback = "/espace-client"
  if (!raw || typeof raw !== "string") return fallback
  const trimmed = raw.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback
  return trimmed.slice(0, 512)
}

function parseAmount(input: unknown): number {
  if (typeof input === "number") return input
  if (typeof input === "string") return Number(input.replace(",", ".").trim())
  return Number.NaN
}

function toFrDate(input: Date): string {
  return input.toLocaleDateString("fr-FR")
}

function parseLeadData(raw: string): {
  raisonSociale?: string
  siret?: string
  activiteFabrication?: string
} {
  try {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>
    return {
      raisonSociale: typeof parsed.raisonSociale === "string" ? parsed.raisonSociale.trim() : undefined,
      siret: typeof parsed.siret === "string" ? parsed.siret.trim() : undefined,
      activiteFabrication:
        typeof parsed.activiteFabrication === "string" ? parsed.activiteFabrication.trim() : undefined,
    }
  } catch {
    return {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    if (!createSupabaseServiceClient()) {
      return NextResponse.json(
        {
          error:
            "Signature électronique non configurée (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 503 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const leadId = typeof payload.leadId === "string" ? payload.leadId.trim() : ""
    const explicitUserId = typeof payload.userId === "string" ? payload.userId.trim() : ""
    const devisReferenceInput =
      typeof payload.devisReference === "string" ? payload.devisReference.trim().slice(0, 120) : ""
    const produitLabel =
      typeof payload.produitLabel === "string" && payload.produitLabel.trim().length > 0
        ? payload.produitLabel.trim().slice(0, 120)
        : "RC Fabriquant — étude personnalisée"
    const afterSignNextPath = normalizeNextPath(
      typeof payload.afterSignNextPath === "string" ? payload.afterSignNextPath : null
    )

    if (!leadId) {
      return NextResponse.json({ error: "leadId requis" }, { status: 400 })
    }

    const lead = await prisma.devisRcFabriquantLead.findUnique({
      where: { id: leadId },
      select: { id: true, email: true, data: true, statut: true },
    })
    if (!lead) {
      return NextResponse.json({ error: "Lead RC Fabriquant introuvable" }, { status: 404 })
    }
    if (normalizeRcFabriquantLeadStatut(lead.statut) === "refuse") {
      return NextResponse.json(
        { error: "Lead au statut « Refusé » : impossible d’envoyer une invitation de signature." },
        { status: 400 }
      )
    }

    const primeAnnuelleTtc = parseAmount(payload.primeAnnuelleTtc)
    if (!Number.isFinite(primeAnnuelleTtc) || primeAnnuelleTtc <= 0) {
      return NextResponse.json({ error: "Prime annuelle TTC invalide (> 0)" }, { status: 400 })
    }

    const primeAnnuelleHtParsed = parseAmount(payload.primeAnnuelleHt)
    const primeAnnuelleHt =
      Number.isFinite(primeAnnuelleHtParsed) && primeAnnuelleHtParsed > 0 ? primeAnnuelleHtParsed : undefined
    if (
      payload.primeAnnuelleHt != null &&
      payload.primeAnnuelleHt !== "" &&
      (primeAnnuelleHt == null || !Number.isFinite(primeAnnuelleHt))
    ) {
      return NextResponse.json({ error: "Prime annuelle HT invalide" }, { status: 400 })
    }

    const periodicite = normalizeRcFabPeriodicity(
      typeof payload.periodicite === "string" ? payload.periodicite.trim().toLowerCase() : null
    )
    const provisionalNumero = `RCFAB-ETUDE-${Date.now()}`
    const dossierConfig = buildRcFabDossierConfig({
      referenceContrat: devisReferenceInput || provisionalNumero,
      periodicite,
      primeAnnuelleTtc,
      primeAnnuelleHt,
    })

    const user = await prisma.user.findFirst({
      where: explicitUserId
        ? { id: explicitUserId }
        : {
            email: lead.email.trim().toLowerCase(),
          },
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
    if (!user?.email) {
      return NextResponse.json(
        {
          error:
            "Aucun compte client trouvé pour ce lead RC Fabriquant. Créez d’abord le compte, puis relancez la création du dossier étude.",
        },
        { status: 404 }
      )
    }

    const existingPending = await prisma.pendingSignature.findFirst({
      where: { userId: user.id },
      select: { signatureRequestId: true },
    })
    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "Une demande de signature est déjà en attente pour ce client. Finalisez ou supprimez-la avant d’en envoyer une nouvelle.",
        },
        { status: 409 }
      )
    }

    const leadData = parseLeadData(lead.data)
    const nomSociete = (user.raisonSociale || leadData.raisonSociale || user.email).trim()
    const siret = (user.siret || leadData.siret || "").trim() || undefined
    const address =
      [user.adresse, user.codePostal, user.ville].filter(Boolean).join(" ").trim() ||
      "Adresse client à confirmer"

    const now = new Date()
    const expiry = new Date(now)
    expiry.setFullYear(expiry.getFullYear() + 1)
    const quoteBytes = await generateRcFabBatteriesQuotePdf({
      nomSociete,
      siret,
      adresse: address,
      activite: dossierConfig.activite,
      dateEffet: toFrDate(now),
      dateEcheance: toFrDate(expiry),
      referenceContrat: dossierConfig.referenceContrat,
      config: dossierConfig,
    })
    const quoteBuffer = Buffer.from(quoteBytes)

    const safeRef = dossierConfig.referenceContrat.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "rcfab"
    const folder = randomUUID()
    const storagePath = `gestion/rc-fabriquant-etude/${folder}/devis-${safeRef}.pdf`
    const { id: signRequestId } = await uploadPdfAndInsertSignRequest(quoteBuffer, storagePath)

    const contractData = {
      signatureProvider: "supabase" as const,
      customUploadedDevisFlow: true,
      modeEtude: true,
      activite: dossierConfig.activite,
      periodicite: dossierConfig.periodicite,
      primeAnnuelleHt: dossierConfig.primeAnnuelleHt,
      primeAnnuelleTtc: dossierConfig.primeAnnuelleTtc,
      primeTtc: dossierConfig.montantParEcheanceTtc,
      rcFabriquantDossierConfig: dossierConfig,
      rcFabriquantDossierConfigSerialized: serializeRcFabDossierConfig(dossierConfig),
      ...(devisReferenceInput ? { devisReference: devisReferenceInput } : {}),
      produitLabel,
      afterSignNextPath,
      sourceLeadType: "rc_fabriquant" as const,
      sourceLeadId: lead.id,
      leadEmail: lead.email,
      leadActiviteFabrication: leadData.activiteFabrication || null,
    }

    const qualityPayload: SignatureQualityGatePayload = {
      flow: "custom_pdf",
      clientLabel: nomSociete,
      reference: dossierConfig.referenceContrat,
      email: user.email,
      annualTtc: dossierConfig.primeAnnuelleTtc,
      periodicity: dossierConfig.periodicite,
      hasPdfFile: true,
    }
    const qualityIssues = runSignatureQualityGates(qualityPayload)
    if (qualityIssues.length > 0) {
      return NextResponse.json(
        {
          error: "Pré-contrôle qualité bloquant : corrigez le dossier avant envoi signature.",
          issues: qualityIssues,
        },
        { status: 400 }
      )
    }

    await prisma.pendingSignature.create({
      data: {
        signatureRequestId: signRequestId,
        userId: user.id,
        contractData: JSON.stringify(contractData),
        contractNumero: dossierConfig.referenceContrat,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const signatureLink = `${baseUrl}/sign/${signRequestId}?next=${encodeURIComponent(afterSignNextPath)}`
    const replyTo = session.user.email?.trim()
    const tpl = EMAIL_TEMPLATES.invitationSignatureDevisPersonnalise(nomSociete, signatureLink, {
      produitLabel,
      montantTtc: dossierConfig.primeAnnuelleTtc,
      reference: dossierConfig.referenceContrat,
    })
    const sent = await sendEmail({
      to: user.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      ...(replyTo ? { replyTo } : {}),
    })
    if (!sent) {
      await prisma.pendingSignature.deleteMany({ where: { signatureRequestId: signRequestId } })
      return NextResponse.json(
        { error: "Envoi e-mail impossible (RESEND_API_KEY / domaine expéditeur)" },
        { status: 503 }
      )
    }

    await prisma.devisRcFabriquantLead.update({
      where: { id: lead.id },
      data: {
        statut: "proposition_envoyee",
        primeProposee: dossierConfig.primeAnnuelleTtc,
        propositionEnvoyeeAt: new Date(),
      },
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "rc_fabriquant_etude_signature_sent",
      targetType: "DevisRcFabriquantLead",
      targetId: lead.id,
      details: {
        userId: user.id,
        userEmail: user.email,
        signRequestId,
        reference: dossierConfig.referenceContrat,
        periodicite: dossierConfig.periodicite,
        primeAnnuelleTtc: dossierConfig.primeAnnuelleTtc,
        primeParEcheanceTtc: dossierConfig.montantParEcheanceTtc,
      },
    })

    return NextResponse.json({
      ok: true,
      message:
        "Dossier RC Fabriquant étude envoyé en signature. Le contrat sera créé après signature, puis l’attestation après paiement.",
      signatureRequestId: signRequestId,
      signatureLink,
      clientEmail: user.email,
    })
  } catch (error) {
    console.error("[gestion/sign/send-rc-fabriquant-etude]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création du dossier étude RC Fabriquant" },
      { status: 500 }
    )
  }
}
