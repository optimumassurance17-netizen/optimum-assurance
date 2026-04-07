import type { PDFImage, PDFPage, PDFFont } from "pdf-lib"
import { LEGAL_ORIAS_LINE } from "@/lib/legal-branding"
import { drawAccelerantLogoOnPage } from "./accelerantLogo"
import { PDF_COLORS, PDF_PAGE } from "./pdfLayout"
import { drawTextPdf, drawWrappedText } from "./pdfUtils"

/**
 * En-tête PDF (pdf-lib) : logo Accelerant (optionnel, centré en tête), monogramme, marque, barre d’accent, titre document.
 * @returns Ordonnée Y pour la suite du contenu (texte sous le bloc titre).
 */
export function drawOptimumHeader(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  title: string,
  subtitle: string,
  accelerantLogo?: PDFImage | null
): number {
  let top: number
  if (accelerantLogo) {
    const { imgBottom } = drawAccelerantLogoOnPage(page, accelerantLogo)
    top = imgBottom - 12
  } else {
    top = PDF_PAGE.height - PDF_PAGE.marginTop
  }
  const x0 = PDF_PAGE.marginX
  const monogramSize = 44
  const rectBottom = top - monogramSize

  page.drawRectangle({
    x: x0,
    y: rectBottom,
    width: monogramSize,
    height: monogramSize,
    color: PDF_COLORS.primary,
    borderWidth: 0,
  })

  const oSize = 22
  const oW = fontBold.widthOfTextAtSize("O", oSize)
  drawTextPdf(page, "O", {
    x: x0 + monogramSize / 2 - oW / 2,
    y: rectBottom + monogramSize / 2 - oSize * 0.35,
    size: oSize,
    font: fontBold,
    color: PDF_COLORS.white,
  })

  const textX = x0 + monogramSize + 12
  let y = top - 8
  drawTextPdf(page, "Optimum Assurance", {
    x: textX,
    y,
    size: 15,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  y -= 14
  drawTextPdf(page, LEGAL_ORIAS_LINE, {
    x: textX,
    y,
    size: 7.5,
    font,
    color: PDF_COLORS.muted,
    maxWidth: PDF_PAGE.contentWidth - monogramSize - 24,
  })
  y -= 10

  const barHeight = 2.5
  const barY = rectBottom - 10
  page.drawRectangle({
    x: x0,
    y: barY,
    width: PDF_PAGE.contentWidth,
    height: barHeight,
    color: PDF_COLORS.primary,
    borderWidth: 0,
  })

  let yDoc = barY - 14
  yDoc = drawWrappedText(
    page,
    title,
    x0,
    yDoc,
    PDF_PAGE.contentWidth,
    fontBold,
    12,
    15,
    PDF_COLORS.text
  )
  yDoc -= 6
  yDoc = drawWrappedText(
    page,
    subtitle,
    x0,
    yDoc,
    PDF_PAGE.contentWidth,
    font,
    9,
    12,
    PDF_COLORS.muted
  )
  yDoc -= 14
  return yDoc
}
