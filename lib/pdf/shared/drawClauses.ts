import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib"
import { drawOptimumHeader } from "./drawHeader"
import { PDF_COLORS, PDF_PAGE } from "./pdfLayout"
import { drawTextPdf, wrapLines } from "./pdfUtils"
import { sanitizeForPdfLib } from "./sanitizePdfText"

const CLAUSE_FONT_SIZE = 9
const CLAUSE_LINE_HEIGHT = 12

/** Écrit des clauses ligne à ligne et ouvre une page de suite avant de déborder. */
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
  const minY = PDF_PAGE.marginBottom + CLAUSE_LINE_HEIGHT

  const continueOnNewPage = () => {
    page = input.pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
    y = drawOptimumHeader(page, input.font, input.fontBold, input.continuationTitle, "", input.logo)
    y -= 8
  }

  for (const clause of input.clauses) {
    if (!clause.trim()) continue
    const lines = wrapLines(
      sanitizeForPdfLib(clause),
      PDF_PAGE.contentWidth,
      input.font,
      CLAUSE_FONT_SIZE
    )
    for (const line of lines) {
      if (y < minY) continueOnNewPage()
      drawTextPdf(page, line, {
        x: PDF_PAGE.marginX,
        y,
        size: CLAUSE_FONT_SIZE,
        font: input.font,
        color: PDF_COLORS.text,
      })
      y -= CLAUSE_LINE_HEIGHT
    }
    y -= 8
  }
  return { page, y }
}
