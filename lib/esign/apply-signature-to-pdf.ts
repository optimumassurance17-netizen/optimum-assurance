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

  const maxW = Math.min(200, width * 0.45)
  const scale = maxW / png.width
  const drawW = png.width * scale
  const drawH = png.height * scale
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
