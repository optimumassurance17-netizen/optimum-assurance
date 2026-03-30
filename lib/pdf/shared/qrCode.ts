import type { PDFDocument } from "pdf-lib"
import QRCode from "qrcode"

/**
 * Embarque un QR code PNG (vérification) dans le document pdf-lib.
 */
export async function embedVerificationQr(pdfDoc: PDFDocument, verificationUrl: string) {
  const dataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 140,
    margin: 1,
    errorCorrectionLevel: "M",
  })
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "")
  const pngBuffer = Buffer.from(base64, "base64")
  return pdfDoc.embedPng(pngBuffer)
}
