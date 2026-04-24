import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { DevisDommageOuvrageData } from "@/lib/dommage-ouvrage-types"
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email"
import { generateDOQuote } from "@/lib/pdf/do/generateQuote"
import { allocateNextContractNumber } from "@/lib/pdf/shared/contractNumber"
import { logPdfGeneration } from "@/lib/pdf/logPdfGeneration"
import { insuranceDataFromDoQuestionnaire } from "@/lib/pdf/quote-email-data"
import { asJsonObject } from "@/lib/json-object"
import { sendNewDevisRequestAlert } from "@/lib/devis-alert"

/**
 * Enregistre une demande de devis dommage ouvrage et envoie une estimation PDF par email si possible.
 */
export async function POST(request: NextRequest) {
  try {
    const body = asJsonObject<{ email?: string; data?: unknown; coutTotal?: number | string }>(await request.json())
    const { email, data, coutTotal } = body

    if (!email || !data) {
      return NextResponse.json(
        { error: "Email et données du questionnaire requis" },
        { status: 400 }
      )
    }

    await prisma.devisDommageOuvrageLead.create({
      data: {
        email,
        data: JSON.stringify(data),
        coutTotal: coutTotal ? Number(coutTotal) : null,
      },
    })

    const session = await getServerSession(authOptions)
    const emailTrim = String(email).trim().toLowerCase()
    if (session?.user?.id && session.user.email?.trim().toLowerCase() === emailTrim) {
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { doInitialQuestionnaireJson: JSON.stringify(data) },
        })
      } catch (e) {
        console.error("[devis-dommage-ouvrage] save user initial JSON:", e)
      }
    }

    const cout = coutTotal ? Number(coutTotal) : 0
    const parsed = data as Partial<DevisDommageOuvrageData>
    const createdAt = new Date().toISOString()

    try {
      const lines: string[] = []
      if (parsed.raisonSociale?.trim()) lines.push(`Raison sociale : ${String(parsed.raisonSociale).trim()}`)
      if (parsed.typeOuvrage) lines.push(`Type d'ouvrage : ${String(parsed.typeOuvrage)}`)
      if (parsed.destinationConstruction) lines.push(`Destination : ${String(parsed.destinationConstruction)}`)
      if (coutTotal != null && Number.isFinite(Number(coutTotal)))
        lines.push(`Montant TTC chantier (déclaré) : ${Number(coutTotal).toLocaleString("fr-FR")} €`)
      await sendNewDevisRequestAlert({
        type: "dommage_ouvrage",
        clientEmail: String(email).trim(),
        lines,
      })
    } catch (e) {
      console.error("[devis-dommage-ouvrage] alerte interne:", e)
    }

    try {
      const basePdf = insuranceDataFromDoQuestionnaire(parsed, cout, createdAt)
      if (basePdf) {
        const contractNumber = await allocateNextContractNumber("do")
        const pdfData = { ...basePdf, contractNumber }
        const bytes = await generateDOQuote(pdfData)
        await logPdfGeneration({
          contractNumber,
          productType: "do",
          documentType: "quote",
          metadata: { source: "devis_dommage_ouvrage_lead" },
        })
        const raison = (parsed.raisonSociale || "").trim() || "Madame, Monsieur"
        const template = EMAIL_TEMPLATES.devisDoEstimationJointe(raison, contractNumber)
        const sent = await sendEmail({
          to: String(email).trim(),
          subject: template.subject,
          text: template.text,
          html: template.html,
          attachments: [{ filename: `devis-do-${contractNumber}.pdf`, content: Buffer.from(bytes) }],
        })
        if (!sent) {
          console.warn("[devis-dommage-ouvrage] email PDF non envoyé (Resend indisponible ou refusé)")
        }
      }
    } catch (e) {
      console.error("[devis-dommage-ouvrage] email PDF:", e)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erreur enregistrement devis DO:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement" },
      { status: 500 }
    )
  }
}
