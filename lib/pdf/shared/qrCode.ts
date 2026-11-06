import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib"
import QRCode from "qrcode"
import { PDF_COLORS, PDF_PAGE } from "./pdfLayout"
import { drawTextPdf, drawWrappedText } from "./pdfUtils"

/** Taille du QR sur l'attestation : lisible, sans descendre dans le pied de page. */
export const ATTESTATION_QR_SIZE = 72

/**
 * Place le QR juste sous le titre, à gauche, avec le lien à côté.
 * Il reste en haut de la première page au lieu de suivre les clauses jusqu'en bas.
 */
export function drawAttestationQrRow(
  page: PDFPage,
  qrImage: PDFImage,
  font: PDFFont,
  fontBold: PDFFont,
  y: number,
  verifyUrl: string
): number {
  const size = ATTESTATION_QR_SIZE
  page.drawImage(qrImage, {
    x: PDF_PAGE.marginX,
    y: y - size,
    width: size,
    height: size,
  })
  const textX = PDF_PAGE.marginX + size + 12
  const textWidth = PDF_PAGE.contentWidth - size - 12
  drawTextPdf(page, "Vérification en ligne", {
    x: textX,
    y: y - 16,
    size: 10,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  drawWrappedText(
    page,
    verifyUrl,
    textX,
    y - 30,
    textWidth,
    font,
    8,
    10,
    PDF_COLORS.muted
  )
  return y - size - 16
}

/**
 * Embarque un code QR PNG (vérification) dans le document pdf-lib.
 */
export async function embedVerificationQr(pdfDoc: PDFDocument, verificationUrl: string) {
  try {
    const dataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 140,
      margin: 1,
      errorCorrectionLevel: "M",
    })
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "")
    const pngBuffer = Buffer.from(base64, "base64")
    return pdfDoc.embedPng(pngBuffer)
  } catch (e) {
    console.error("[pdf] embedVerificationQr:", verificationUrl.slice(0, 80), e)
    throw new Error("QR_CODE_GENERATION_FAILED")
  }
}
