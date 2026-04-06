import type { PDFPage, PDFFont } from "pdf-lib"
import { rgb } from "pdf-lib"
import { LEGAL_FOOTER_LINES } from "@/lib/legal-branding"
import { sanitizeForPdfLib } from "./sanitizePdfText"

/** Points PDF (A4) */
export const PDF_PAGE = {
  width: 595.28,
  height: 841.89,
  marginX: 50,
  marginTop: 52,
  marginBottom: 88,
  contentWidth: 595.28 - 50 * 2,
} as const

/** Accent marque — bleu (#2563eb), aligné site web */
export const PDF_COLORS = {
  primary: rgb(37 / 255, 99 / 255, 235 / 255),
  text: rgb(0.09, 0.09, 0.09),
  muted: rgb(0.25, 0.25, 0.25),
  white: rgb(1, 1, 1),
} as const

export { LEGAL_FOOTER_LINES }

export const ANTI_FRAUD_LINE =
  "Document valable uniquement si paiement effectif et validation assureur."

export const ATTESTATION_WARNING =
  "Document informatif ne remplaçant pas le contrat."

/**
 * Pied de page sur une page (numérotation dynamique).
 */
export function drawPdfFooter(
  page: PDFPage,
  pageIndex1: number,
  totalPages: number,
  font: PDFFont,
  fontBold: PDFFont
): void {
  const { width } = page.getSize()
  const size = 8
  const lineGap = 10
  /** Coordonnée Y du bas de page : le texte du pied monte vers les Y plus grands */
  let y = 56
  for (const line of LEGAL_FOOTER_LINES) {
    page.drawText(sanitizeForPdfLib(line), {
      x: PDF_PAGE.marginX,
      y,
      size,
      font: line.includes("délégation") ? fontBold : font,
      color: PDF_COLORS.muted,
      maxWidth: PDF_PAGE.contentWidth,
    })
    y -= lineGap
  }

  const pageLabel = sanitizeForPdfLib(`Page ${pageIndex1} / ${totalPages}`)
  page.drawText(pageLabel, {
    x: width - PDF_PAGE.marginX - font.widthOfTextAtSize(pageLabel, size),
    y: 56,
    size,
    font,
    color: PDF_COLORS.muted,
  })
}
