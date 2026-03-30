import { PDFDocument, StandardFonts } from "pdf-lib"

export async function embedStandardFonts(pdfDoc: PDFDocument) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  return { font, fontBold }
}
