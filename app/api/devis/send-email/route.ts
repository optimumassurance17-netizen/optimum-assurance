import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { SITE_URL as APP_URL } from "@/lib/site-url"
import { generateDecennaleQuote } from "@/lib/pdf/decennale/generateQuote"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { logPdfGeneration } from "@/lib/pdf/logPdfGeneration"
import { insuranceDataFromDecennaleDevis } from "@/lib/pdf/quote-email-data"
import { asJsonObject } from "@/lib/json-object"
import { sendNewDevisRequestAlert } from "@/lib/devis-alert"

const DRAFT_EXPIRY_DAYS = 7

type DecennaleDraftTarif = {
  primeAnnuelle?: number
}

type DecennaleDraftPayload = {
  raisonSociale?: string
  siret?: string
  tarif?: DecennaleDraftTarif
}

/**
 * Envoie le devis par email avec lien de reprise
 * Sauvegarde le brouillon et enregistre le lead
 */
export async function POST(request: NextRequest) {
  try {
    const body = asJsonObject<{ email?: string; devis?: unknown }>(await request.json())
    const email = typeof body.email === "string" ? body.email : ""
    const devis = asJsonObject<DecennaleDraftPayload>(body.devis)

    if (!email || Object.keys(devis).length === 0) {
      return NextResponse.json({ error: "Email et devis requis" }, { status: 400 })
    }

    const tarif = devis.tarif
    const token = crypto.randomBytes(24).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + DRAFT_EXPIRY_DAYS)
    const resumeUrl = `${APP_URL}/devis/resume/${token}`

    await prisma.devisDraft.create({
      data: {
        token,
        email: String(email).trim().toLowerCase(),
        data: JSON.stringify(devis),
        produit: "decennale",
        expiresAt,
      },
    })

    const createdAt = new Date().toISOString()
    let pdfBytes: Uint8Array | null = null
    let contractNumberForPdf: string | undefined
    try {
      const base = insuranceDataFromDecennaleDevis(devis, createdAt)
      contractNumberForPdf = await allocateNextContractNumber("decennale")
      const pdfData = { ...base, contractNumber: contractNumberForPdf }
      pdfBytes = await generateDecennaleQuote(pdfData)
      await logPdfGeneration({
        contractNumber: contractNumberForPdf,
        productType: "decennale",
        documentType: "quote",
        metadata: { source: "devis_send_email" },
      })
    } catch (e) {
      console.error("[devis/send-email] PDF décennale:", e)
    }

    const template = EMAIL_TEMPLATES.devisSauvegarde(email, resumeUrl, {
      pdfJoint: !!pdfBytes,
    })
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: (template as { html?: string }).html,
      ...(pdfBytes &&
        contractNumberForPdf && {
          attachments: [
            {
              filename: `devis-decennale-${contractNumberForPdf}.pdf`,
              content: Buffer.from(pdfBytes),
            },
          ],
        }),
    })

    if (!sent) {
      return NextResponse.json(
        { error: "Envoi d'email non configuré (RESEND_API_KEY)" },
        { status: 503 }
      )
    }

    await prisma.devisLead.create({
      data: {
        email,
        raisonSociale: devis.raisonSociale || undefined,
        siret: devis.siret || undefined,
        primeAnnuelle: tarif?.primeAnnuelle ?? undefined,
      },
    })

    try {
      const lines: string[] = []
      if (devis.raisonSociale?.trim()) lines.push(`Raison sociale : ${String(devis.raisonSociale).trim()}`)
      if (devis.siret?.trim()) lines.push(`SIRET : ${String(devis.siret).trim()}`)
      if (typeof tarif?.primeAnnuelle === "number")
        lines.push(`Prime annuelle indicative : ${tarif.primeAnnuelle.toLocaleString("fr-FR")} €`)
      lines.push(`Lien reprise du brouillon : ${resumeUrl}`)
      await sendNewDevisRequestAlert({
        type: "decennale",
        clientEmail: String(email).trim(),
        lines,
      })
    } catch (e) {
      console.error("[devis/send-email] alerte interne:", e)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur envoi email devis:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'envoi" },
      { status: 500 }
    )
  }
}
