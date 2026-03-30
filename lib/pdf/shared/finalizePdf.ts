import type { PDFDocument } from "pdf-lib"
import type { PDFFont } from "pdf-lib"
import { drawPdfFooter } from "./pdfLayout"

export async function finalizeWithFooters(
  pdfDoc: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont
): Promise<Uint8Array> {
  const pages = pdfDoc.getPages()
  const total = pages.length
  pages.forEach((page, i) => {
    drawPdfFooter(page, i + 1, total, font, fontBold)
  })
  return pdfDoc.save()
}
