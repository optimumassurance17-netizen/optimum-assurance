import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceData } from "../types"
import { validateDoQuote } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"

const QUOTE_VALIDITY_DAYS = 30

export async function generateDOQuote(data: InsuranceData): Promise<Uint8Array> {
  validateDoQuote(data)

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "DEVIS — Assurance dommages-ouvrage",
    "Construction / maître d’ouvrage",
    accelerantLogo
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

  drawTextPdf(page, "Maître d'ouvrage / client", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(page, data.clientName, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  y -= 8
  y = drawWrappedText(page, data.address, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  y -= 18

  drawTextPdf(page, "Opération de construction", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(page, data.projectName!, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  y -= 8
  y = drawWrappedText(page, data.projectAddress!, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  if (data.constructionNature) {
    y -= 8
    y = drawWrappedText(
      page,
      `Nature des travaux : ${data.constructionNature}`,
      PDF_PAGE.marginX,
      y,
      PDF_PAGE.contentWidth,
      font,
      10,
      13
    )
  }
  y -= 18

  drawTextPdf(page, "Prime TTC (indicative)", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page, formatEuro(data.premium), {
    x: PDF_PAGE.marginX,
    y,
    size: 12,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  y -= 16
  drawTextPdf(page, "Franchise : aucune (garantie obligatoire DO).", {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
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
    `CG dommage ouvrage : ${SITE_URL}/conditions-generales-dommage-ouvrage — CGV : ${SITE_URL}/cgv — attestations : ${SITE_URL}/conditions-attestations`,
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
