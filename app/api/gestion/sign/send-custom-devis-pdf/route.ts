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

export const runtime = "nodejs"

const MAX_BYTES = 15 * 1024 * 1024

function normalizeNextPath(raw: string | null): string {
  const d = "/espace-client"
  if (!raw || typeof raw !== "string") return d
  const t = raw.trim()
  if (!t.startsWith("/") || t.startsWith("//")) return d
  return t.slice(0, 512)
}

/**
 * Admin : envoie un PDF (devis / proposition) au client pour signature électronique.
 * Après signature, un InsuranceContract `rc_fabriquant` est créé (voir applyPendingFinalize).
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
    const primeTtcRaw = form.get("primeTtc")
    const primeAnnuelleTtcRaw = form.get("primeAnnuelleTtc")
    const primeAnnuelleHtRaw = form.get("primeAnnuelleHt")
    const periodiciteRaw = form.get("periodicite")
    const devisReference =
      typeof form.get("devisReference") === "string" ? (form.get("devisReference") as string).trim().slice(0, 120) : ""
    const produitLabel =
      typeof form.get("produitLabel") === "string"
        ? (form.get("produitLabel") as string).trim().slice(0, 120)
        : "Proposition commerciale"
    const afterSignNextPath = normalizeNextPath(
      typeof form.get("afterSignNextPath") === "string" ? (form.get("afterSignNextPath") as string) : null
    )

    const file = form.get("pdf")
    if (!userId) {
      return NextResponse.json({ error: "Client (userId) requis" }, { status: 400 })
    }

    const periodicite = normalizeRcFabPeriodicity(
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
    const installmentsPerYear = periodicite === "mensuel" ? 12 : periodicite === "semestriel" ? 2 : periodicite === "annuel" ? 1 : 4
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
      select: { id: true, email: true, raisonSociale: true },
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

    const provisionalNumero = `PDF-PENDING-${Date.now()}`
    const dossierConfig = buildRcFabDossierConfig({
      referenceContrat: devisReference || provisionalNumero,
      periodicite,
      primeAnnuelleTtc,
      primeAnnuelleHt: Number.isFinite(primeAnnuelleHt) ? primeAnnuelleHt : undefined,
    })
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
      ...(devisReference ? { devisReference } : {}),
      produitLabel,
      afterSignNextPath,
    }
    const qualityPayload: SignatureQualityGatePayload = {
      flow: "custom_pdf",
      clientLabel: user.raisonSociale || user.email,
      reference: devisReference || provisionalNumero,
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
        contractNumero: provisionalNumero,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const nextQ = encodeURIComponent(afterSignNextPath)
    const signatureLink = `${baseUrl}/sign/${signRequestId}?next=${nextQ}`

    const raison = (user.raisonSociale || user.email).trim()
    const tpl = EMAIL_TEMPLATES.invitationSignatureDevisPersonnalise(raison, signatureLink, {
      produitLabel,
      montantTtc: dossierConfig.primeAnnuelleTtc,
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
    await sendRcFabriquantEmailCopy({
      originalTo: user.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      contextLabel: "invitation_signature_devis_pdf_personnalise_rc_fabriquant",
    })

    await logAdminActivity({
      adminEmail: session.user.email || "admin",
      action: "custom_devis_pdf_signature_sent",
      targetType: "user",
      targetId: user.id,
      details: {
        signRequestId,
        produitLabel,
        modeEtude: true,
        primeAnnuelleTtc: dossierConfig.primeAnnuelleTtc,
        montantParEcheanceTtc: dossierConfig.montantParEcheanceTtc,
        periodicite: dossierConfig.periodicite,
      },
    })

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
