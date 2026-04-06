import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceData } from "../types"
import { validateDecennaleQuote } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"

const QUOTE_VALIDITY_DAYS = 30

/**
 * Devis décennale — pdf-lib, mentions légales Accelerant / délégation (pied de page).
 */
export async function generateDecennaleQuote(data: InsuranceData): Promise<Uint8Array> {
  validateDecennaleQuote(data)

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "DEVIS — Assurance responsabilité civile décennale",
    "Assurance décennale professionnelle"
  )

  drawTextPdf(page, `N° ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 10,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page, `Émis le ${formatGeneratedAt(data.createdAt)}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })
  y -= 22

  y = drawWrappedText(
    page,
    "Assureur : Accelerant Insurance — Distribution : Optimum Courtage (ORIAS LPS 28931947).",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    9,
    12,
    PDF_COLORS.muted
  )
  y -= 16

  drawTextPdf(page, "Client", { x: PDF_PAGE.marginX, y, size: 11, font: fontBold, color: PDF_COLORS.text })
  y -= 14
  y = drawWrappedText(page, data.clientName, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  if (data.siret) {
    y -= 4
    y = drawWrappedText(page, `SIRET : ${data.siret}`, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  }
  y -= 8
  y = drawWrappedText(page, data.address, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  y -= 18

  drawTextPdf(page, "Activités déclarées", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page,
    data.activities!.join(", "),
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    10,
    13
  )
  y -= 18

  drawTextPdf(page, "Prime TTC (indicative)", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  page.drawText(formatEuro(data.premium), {
    x: PDF_PAGE.marginX,
    y,
    size: 12,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  y -= 20

  drawTextPdf(page, `Validité du devis : ${QUOTE_VALIDITY_DAYS} jours à compter de la date d'émission.`, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page,
    "Devis non contractuel soumis à validation assureur.",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    fontBold,
    10,
    13,
    PDF_COLORS.primary
  )
  y -= 12
  y = drawWrappedText(page, ANTI_FRAUD_LINE, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 9, 12, PDF_COLORS.muted)
  y -= 14
  y = drawWrappedText(
    page,
    `CGV et conditions d’émission des attestations : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    8,
    11,
    PDF_COLORS.muted
  )

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
