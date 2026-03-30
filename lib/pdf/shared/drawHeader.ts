import type { PDFPage, PDFFont } from "pdf-lib"
import { PDF_COLORS, PDF_PAGE } from "./pdfLayout"

export function drawOptimumHeader(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  title: string,
  subtitle: string
): number {
  const w = 118
  const h = 34
  const top = PDF_PAGE.height - PDF_PAGE.marginTop
  const yRect = top - h
  page.drawRectangle({
    x: PDF_PAGE.marginX,
    y: yRect,
    width: w,
    height: h,
    borderColor: PDF_COLORS.primary,
    borderWidth: 1,
  })
  page.drawText("LOGO", {
    x: PDF_PAGE.marginX + w / 2 - font.widthOfTextAtSize("LOGO", 9) / 2,
    y: yRect + h / 2 - 3,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })

  let y = top - h - 18
  page.drawText("Optimum Assurance", {
    x: PDF_PAGE.marginX,
    y,
    size: 16,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  y -= 16
  page.drawText(subtitle, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })
  y -= 28
  page.drawText(title, {
    x: PDF_PAGE.marginX,
    y,
    size: 13,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 22
  return y
}
