/**
 * Génère une image PNG en data URI pour @react-pdf/renderer (Image src).
 */
import QRCode from "qrcode"

export async function qrCodePngDataUri(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 160,
    margin: 1,
    errorCorrectionLevel: "M",
  })
}
