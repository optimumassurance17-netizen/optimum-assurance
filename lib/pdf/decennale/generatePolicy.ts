import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceData } from "../types"
import { validateDecennaleQuote } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"

/**
 * Conditions particulières — contrat décennale (pdf-lib).
 */
export async function generateDecennalePolicy(data: InsuranceData): Promise<Uint8Array> {
  validateDecennaleQuote(data)

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "CONDITIONS PARTICULIÈRES — Assurance décennale",
    "Contrat RC décennale",
    accelerantLogo
  )

  drawTextPdf(page, `Contrat N° ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page, `Document généré le ${formatGeneratedAt(data.createdAt)}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })
  y -= 20

  const clauses: string[] = [
    "Assureur : Accelerant Insurance.",
    "Courtier : Optimum Courtage, ORIAS LPS 28931947.",
    "Optimum Courtage agit par délégation de Accelerant Insurance.",
    `Assuré : ${data.clientName}${data.siret ? ` — SIRET ${data.siret}` : ""}.`,
    `Adresse : ${data.address}.`,
    `Période : du ${data.startDate} au ${data.endDate}.`,
    `Activités garanties : ${data.activities!.join(", ")}.`,
    `Prime annuelle TTC : ${formatEuro(data.premium)}.`,
    "Paiement : prélèvement SEPA selon mandat et échéances contractuelles.",
    "Le souscripteur atteste l’exactitude de ses déclarations. Signature et paiement valent engagement sous réserve d’acceptation du risque par l’assureur.",
    `Conditions générales et attestations : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
  ]

  for (const c of clauses) {
    y = drawWrappedText(page, c, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 9, 12)
    y -= 8
  }

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
