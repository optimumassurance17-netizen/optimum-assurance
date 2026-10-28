import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const PNG_PREFIX = /^data:image\/png;base64,/i

function stripPngBase64(dataUrl: string): Uint8Array {
  const raw = dataUrl.replace(PNG_PREFIX, "").trim()
  return Uint8Array.from(Buffer.from(raw, "base64"))
}

function sanitizeLine(text: string, maxLen: number): string {
  const ascii = text.replace(/[^\x20-\x7E]/g, "?")
  return ascii.length > maxLen ? `${ascii.slice(0, maxLen - 1)}…` : ascii
}

/** Taille maximale du trait sur la page, en points PDF (environ 6,3 cm × 2,3 cm). */
export const SIGNATURE_STAMP_MAX_WIDTH_PT = 180
export const SIGNATURE_STAMP_MAX_HEIGHT_PT = 64

/** Ramène le trait dans le cadre, en l’agrandissant s’il a été dessiné petit. */
export function signatureStampSize(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number
): { width: number; height: number } {
  const maxW = Math.min(SIGNATURE_STAMP_MAX_WIDTH_PT, Math.max(48, pageWidth * 0.45))
  const maxH = Math.min(SIGNATURE_STAMP_MAX_HEIGHT_PT, Math.max(24, pageHeight * 0.16))
  const scale = Math.min(maxW / imageWidth, maxH / imageHeight)
  return { width: imageWidth * scale, height: imageHeight * scale }
}

/**
 * Ajoute l’image de signature et une ligne de texte sur la première page (coin bas-gauche).
 */
export async function applySignatureToPdf(
  pdfBytes: Uint8Array,
  signaturePngDataUrl: string,
  email: string,
  signedAtIso: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes)
  const pages = doc.getPages()
  if (pages.length === 0) throw new Error("PDF sans page")
  const page = pages[0]
  const { width, height } = page.getSize()

  const pngBytes = stripPngBase64(signaturePngDataUrl)
  const png = await doc.embedPng(pngBytes)
  if (png.width < 1 || png.height < 1) throw new Error("Signature vide")

  const { width: drawW, height: drawH } = signatureStampSize(png.width, png.height, width, height)
  const margin = 48
  const imgX = margin
  const imgY = margin

  if (imgY + drawH > height - margin) {
    throw new Error("Page trop petite pour placer la signature")
  }

  page.drawImage(png, { x: imgX, y: imgY, width: drawW, height: drawH })

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const line = sanitizeLine(`Signed by ${email} on ${signedAtIso}`, 200)
  const textY = Math.max(24, imgY - 18)
  page.drawText(line, {
    x: imgX,
    y: textY,
    size: 9,
    font,
    color: rgb(0.15, 0.15, 0.15),
  })

  return doc.save()
}
