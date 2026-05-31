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
import { sendRcFabriquantEmailCopy } from "@/lib/rc-fabriquant-email-copy"
import {
  buildAssuranceTitreContractConfig,
  buildAssuranceTitreDossierSnapshotFromUserData,
  serializeAssuranceTitreContractConfig,
} from "@/lib/assurance-titre-contract-config"
import {
  getInsuranceProductLabel,
  normalizeInsurancePlatformProductType,
  type InsurancePlatformProductType,
} from "@/lib/insurance-product"

export const runtime = "nodejs"

const MAX_BYTES = 15 * 1024 * 1024

function normalizeNextPath(raw: string | null): string {
  const d = "/espace-client"
  if (!raw || typeof raw !== "string") return d
  const t = raw.trim()
  if (!t.startsWith("/") || t.startsWith("//")) return d
  return t.slice(0, 512)
}

function normalizeSourceLeadType(value: string | null): "rc_fabriquant" | "assurance_titre" | null {
  if (value === "rc_fabriquant" || value === "assurance_titre") return value
  return null
}

async function updateSourceLeadStatus(params: {
  sourceLeadType: "rc_fabriquant" | "assurance_titre"
  sourceLeadId: string
  adminEmail: string
  productType: InsurancePlatformProductType
  signRequestId: string
}) {
  if (params.sourceLeadType === "rc_fabriquant") {
    await prisma.devisRcFabriquantLead.updateMany({
      where: { id: params.sourceLeadId },
      data: { statut: "proposition_envoyee" },
    })
  } else {
    await prisma.devisAssuranceTitreLead.updateMany({
      where: { id: params.sourceLeadId },
      data: { statut: "proposition_envoyee" },
    })
  }

  await logAdminActivity({
    adminEmail: params.adminEmail,
    action: "lead_signature_invitation_sent",
    targetType:
      params.sourceLeadType === "rc_fabriquant"
        ? "DevisRcFabriquantLead"
        : "DevisAssuranceTitreLead",
    targetId: params.sourceLeadId,
    details: {
      productType: params.productType,
      signRequestId: params.signRequestId,
    },
  })
}

/**
 * Admin : envoie un PDF (devis / proposition) au client pour signature électronique.
 * Après signature, un InsuranceContract produit est créé (voir applyPendingFinalize).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdmin(session)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    if (!createSupabaseServiceClient()) {
      return NextResponse.json(
        { error: "Signature électronique non configurée (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)." },
        { status: 503 }
      )
    }

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return NextResponse.json({ error: "Formulaire multipart invalide" }, { status: 400 })
    }

    const userId = typeof form.get("userId") === "string" ? (form.get("userId") as string).trim() : ""
    const productType = normalizeInsurancePlatformProductType(
      typeof form.get("productType") === "string" ? (form.get("productType") as string).trim() : "",
      "rc_fabriquant"
    )
    if (productType !== "rc_fabriquant" && productType !== "assurance_titre") {
      return NextResponse.json(
        { error: "Produit non supporté pour ce flux PDF (RC Fabriquant ou Assurance titre)." },
        { status: 400 }
      )
    }
    const primeTtcRaw = form.get("primeTtc")
    const primeAnnuelleTtcRaw = form.get("primeAnnuelleTtc")
    const primeAnnuelleHtRaw = form.get("primeAnnuelleHt") ?? form.get("primeHtAnnuel")
    const periodiciteRaw = form.get("periodicite")
    const coverageDurationYearsRaw = form.get("coverageDurationYears")
    const sourceLeadType = normalizeSourceLeadType(
      typeof form.get("sourceLeadType") === "string" ? (form.get("sourceLeadType") as string).trim() : null
    )
    const sourceLeadId =
      typeof form.get("sourceLeadId") === "string" ? (form.get("sourceLeadId") as string).trim() : ""
    const devisReference =
      typeof form.get("devisReference") === "string" ? (form.get("devisReference") as string).trim().slice(0, 120) : ""
    const produitLabel =
      typeof form.get("produitLabel") === "string"
        ? (form.get("produitLabel") as string).trim().slice(0, 120)
        : productType === "assurance_titre"
          ? "Assurance titre — proposition digitale"
          : "RC Fabriquant — proposition"
    const afterSignNextPath = normalizeNextPath(
      typeof form.get("afterSignNextPath") === "string" ? (form.get("afterSignNextPath") as string) : null
    )

    const file = form.get("pdf")
    if (!userId) {
      return NextResponse.json({ error: "Client (userId) requis" }, { status: 400 })
    }

    const periodicite =
      productType === "assurance_titre"
        ? "annuel"
        : normalizeRcFabPeriodicity(
            typeof periodiciteRaw === "string" ? periodiciteRaw.trim().toLowerCase() : null
          )
    const primeAnnuelleTtcParsed =
      typeof primeAnnuelleTtcRaw === "string"
        ? Number(primeAnnuelleTtcRaw.replace(",", "."))
        : typeof primeAnnuelleTtcRaw === "number"
          ? primeAnnuelleTtcRaw
          : NaN
    const legacyPrimePerInstallmentParsed =
      typeof primeTtcRaw === "string"
        ? Number(primeTtcRaw.replace(",", "."))
        : typeof primeTtcRaw === "number"
          ? primeTtcRaw
          : NaN
    const installmentsPerYear =
      periodicite === "mensuel"
        ? 12
        : periodicite === "semestriel"
          ? 2
          : periodicite === "annuel"
            ? 1
            : 4
    const primeAnnuelleTtc =
      Number.isFinite(primeAnnuelleTtcParsed) && primeAnnuelleTtcParsed > 0
        ? primeAnnuelleTtcParsed
        : Number.isFinite(legacyPrimePerInstallmentParsed) && legacyPrimePerInstallmentParsed > 0
          ? legacyPrimePerInstallmentParsed * installmentsPerYear
          : NaN
    const primeAnnuelleHt =
      typeof primeAnnuelleHtRaw === "string" && primeAnnuelleHtRaw.trim().length > 0
        ? Number(primeAnnuelleHtRaw.replace(",", "."))
        : NaN

    if (!Number.isFinite(primeAnnuelleTtc) || primeAnnuelleTtc <= 0) {
      return NextResponse.json({ error: "Prime annuelle TTC requise (nombre > 0)" }, { status: 400 })
    }
    if (
      typeof primeAnnuelleHtRaw === "string" &&
      primeAnnuelleHtRaw.trim().length > 0 &&
      (!Number.isFinite(primeAnnuelleHt) || primeAnnuelleHt <= 0)
    ) {
      return NextResponse.json({ error: "Prime annuelle HT invalide" }, { status: 400 })
    }

    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: "Fichier PDF requis" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF trop volumineux (max. 15 Mo)" }, { status: 400 })
    }
    const mime = (file as File).type || ""
    if (mime && mime !== "application/pdf") {
      return NextResponse.json({ error: "Le fichier doit être un PDF" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        raisonSociale: true,
        titleInitialQuestionnaireJson: true,
        titleEtudeQuestionnaireJson: true,
      },
    })
    if (!user?.email) {
      return NextResponse.json({ error: "Client introuvable ou sans e-mail" }, { status: 404 })
    }

    const existingPending = await prisma.pendingSignature.findFirst({
      where: { userId: user.id },
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

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length < 5 || buf.subarray(0, 5).toString() !== "%PDF-") {
      return NextResponse.json({ error: "Le fichier n’est pas un PDF valide (en-tête manquant)" }, { status: 400 })
    }

    const folder = randomUUID()
    const storagePath = `gestion/devis-pdf/${folder}/devis.pdf`
    const { id: signRequestId } = await uploadPdfAndInsertSignRequest(buf, storagePath)

    const provisionalNumero = `${productType === "assurance_titre" ? "TITRE" : "PDF"}-PENDING-${Date.now()}`
    const coverageDurationYears =
      typeof coverageDurationYearsRaw === "string" && coverageDurationYearsRaw.trim().length > 0
        ? Number(coverageDurationYearsRaw.trim())
        : Number.NaN
    const titleSnapshot = buildAssuranceTitreDossierSnapshotFromUserData({
      initialQuestionnaireJson: user.titleInitialQuestionnaireJson,
      etudeQuestionnaireJson: user.titleEtudeQuestionnaireJson,
      fallbackName: user.raisonSociale || user.email,
      fallbackStructureName: user.raisonSociale || undefined,
    })

    let annualTtc = primeAnnuelleTtc
    let amountPerInstallment = primeAnnuelleTtc
    let periodicityForQuality: "mensuel" | "trimestriel" | "semestriel" | "annuel" = "annuel"
    let coverageDurationYearsForLog: number | undefined
    let contractData: Record<string, unknown>

    if (productType === "assurance_titre") {
      const titleConfig = buildAssuranceTitreContractConfig({
        referenceContrat: devisReference || provisionalNumero,
        primeAnnuelleTtc,
        primeAnnuelleHt: Number.isFinite(primeAnnuelleHt) ? primeAnnuelleHt : undefined,
        coverageDurationYears: Number.isFinite(coverageDurationYears) ? coverageDurationYears : undefined,
        productLabel: produitLabel,
        dossier: titleSnapshot,
      })
      annualTtc = titleConfig.primeAnnuelleTtc
      amountPerInstallment = titleConfig.montantParEcheanceTtc
      periodicityForQuality = titleConfig.periodicite
      coverageDurationYearsForLog = titleConfig.coverageDurationYears
      contractData = {
        signatureProvider: "supabase",
        customUploadedDevisFlow: true,
        productType,
        modeEtude: true,
        periodicite: titleConfig.periodicite,
        primeAnnuelleHt: titleConfig.primeAnnuelleHt,
        primeAnnuelleTtc: titleConfig.primeAnnuelleTtc,
        primeTtc: titleConfig.montantParEcheanceTtc,
        assuranceTitreContractConfig: titleConfig,
        assuranceTitreContractConfigSerialized: serializeAssuranceTitreContractConfig(titleConfig),
        coverageDurationYears: titleConfig.coverageDurationYears,
        ...(devisReference ? { devisReference } : {}),
        ...(sourceLeadType ? { sourceLeadType } : {}),
        ...(sourceLeadId ? { sourceLeadId } : {}),
        produitLabel,
        afterSignNextPath,
      }
    } else {
      const rcConfig = buildRcFabDossierConfig({
        referenceContrat: devisReference || provisionalNumero,
        periodicite,
        primeAnnuelleTtc,
        primeAnnuelleHt: Number.isFinite(primeAnnuelleHt) ? primeAnnuelleHt : undefined,
      })
      annualTtc = rcConfig.primeAnnuelleTtc
      amountPerInstallment = rcConfig.montantParEcheanceTtc
      periodicityForQuality = rcConfig.periodicite
      contractData = {
        signatureProvider: "supabase",
        customUploadedDevisFlow: true,
        productType,
        modeEtude: true,
        activite: rcConfig.activite,
        periodicite: rcConfig.periodicite,
        primeAnnuelleHt: rcConfig.primeAnnuelleHt,
        primeAnnuelleTtc: rcConfig.primeAnnuelleTtc,
        primeTtc: rcConfig.montantParEcheanceTtc,
        rcFabriquantDossierConfig: rcConfig,
        rcFabriquantDossierConfigSerialized: serializeRcFabDossierConfig(rcConfig),
        ...(devisReference ? { devisReference } : {}),
        ...(sourceLeadType ? { sourceLeadType } : {}),
        ...(sourceLeadId ? { sourceLeadId } : {}),
        produitLabel,
        afterSignNextPath,
      }
    }
    const qualityPayload: SignatureQualityGatePayload = {
      flow: "custom_pdf",
      clientLabel: user.raisonSociale || titleSnapshot.contactName || user.email,
      reference: devisReference || provisionalNumero,
      email: user.email,
      annualTtc,
      periodicity: periodicityForQuality,
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
        contractNumero: provisionalNumero,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const nextQ = encodeURIComponent(afterSignNextPath)
    const signatureLink = `${baseUrl}/sign/${signRequestId}?next=${nextQ}`

    const raison = (user.raisonSociale || user.email).trim()
    const tpl = EMAIL_TEMPLATES.invitationSignatureDevisPersonnalise(raison, signatureLink, {
      produitLabel,
      montantTtc: annualTtc,
      reference: devisReference || undefined,
    })

    const replyTo = session.user.email?.trim()
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
    if (productType === "rc_fabriquant") {
      await sendRcFabriquantEmailCopy({
        originalTo: user.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
        contextLabel: "invitation_signature_devis_pdf_personnalise_rc_fabriquant",
      })
    }

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "custom_devis_pdf_signature_sent",
      targetType: "user",
      targetId: user.id,
      details: {
        signRequestId,
        productType,
        productLabel: getInsuranceProductLabel(productType),
        produitLabel,
        modeEtude: true,
        primeAnnuelleTtc: annualTtc,
        montantParEcheanceTtc: amountPerInstallment,
        periodicite: periodicityForQuality,
        ...(coverageDurationYearsForLog ? { coverageDurationYears: coverageDurationYearsForLog } : {}),
      },
    })

    if (sourceLeadType && sourceLeadId) {
      await updateSourceLeadStatus({
        sourceLeadType,
        sourceLeadId,
        adminEmail: session.user.email || "admin",
        productType,
        signRequestId,
      }).catch((error) => {
        console.error("[gestion/sign/send-custom-devis-pdf] maj lead source:", error)
      })
    }

    return NextResponse.json({
      ok: true,
      message: `Invitation envoyée à ${user.email}.`,
      signatureRequestId: signRequestId,
      signatureLink,
      clientEmail: user.email,
    })
  } catch (error) {
    console.error("[gestion/sign/send-custom-devis-pdf]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l’envoi" },
      { status: 500 }
    )
  }
}
