import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib"
import { drawOptimumHeader } from "./drawHeader"
import { PDF_COLORS, PDF_PAGE } from "./pdfLayout"
import { drawWrappedText } from "./pdfUtils"

/** Écrit des clauses et ouvre une page de suite quand le bas de page est atteint. */
export function drawClausesPaginated(input: {
  pdfDoc: PDFDocument
  page: PDFPage
  y: number
  font: PDFFont
  fontBold: PDFFont
  logo?: PDFImage | null
  clauses: readonly string[]
  continuationTitle: string
}): { page: PDFPage; y: number } {
  let page = input.page
  let y = input.y
  for (const clause of input.clauses) {
    if (!clause.trim()) continue
    if (y < PDF_PAGE.marginBottom + 56) {
      page = input.pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
      y = drawOptimumHeader(page, input.font, input.fontBold, input.continuationTitle, "", input.logo)
      y -= 8
    }
    y = drawWrappedText(
      page,
      clause,
      PDF_PAGE.marginX,
      y,
      PDF_PAGE.contentWidth,
      input.font,
      9,
      12,
      PDF_COLORS.text
    )
    y -= 8
  }
  return { page, y }
}
