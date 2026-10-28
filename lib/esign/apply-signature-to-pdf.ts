import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const PNG_PREFIX = /^data:image\/png;base64,/i

function stripPngBase64(dataUrl: string): Uint8Array {
  const raw = dataUrl.replace(PNG_PREFIX, "").trim()
  return Uint8Array.from(Buffer.from(raw, "base64"))
}

const PARIS = "Europe/Paris"

/** Garde les lettres françaises que la police du PDF sait écrire. */
function keepWinAnsi(text: string): string {
  let out = ""
  for (const ch of text.normalize("NFC")) {
    const code = ch.codePointAt(0) ?? 0
    if (code === 0x20 || (code >= 0x21 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff)) out += ch
    else if (ch === "€") out += " EUR "
    else out += " "
  }
  return out.replace(/\s+/g, " ").trim()
}

function frenchSignatureWhen(signedAtIso: string): string {
  const date = new Date(signedAtIso)
  if (Number.isNaN(date.getTime())) return "date de signature indisponible"
  const day = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const hour = String(Number(parts.find((part) => part.type === "hour")?.value ?? "0"))
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00"
  return `${day} à ${hour} h ${minute}`
}

/** Deux lignes entièrement en français, heure de Paris. */
export function signatureStampLines(email: string, signedAtIso: string): [string, string] {
  const safeEmail = keepWinAnsi(email) || "signataire"
  const when = frenchSignatureWhen(signedAtIso)
  if (when === "date de signature indisponible") {
    return [`Signé par ${safeEmail}`, "Date de signature indisponible."]
  }
  return [`Signé par ${safeEmail}`, `le ${when}, heure de Paris.`]
}

function fitStampLine(
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  line: string,
  size: number,
  maxWidth: number
): string {
  if (font.widthOfTextAtSize(line, size) <= maxWidth) return line
  let shown = line
  while (shown.length > 12 && font.widthOfTextAtSize(`${shown}...`, size) > maxWidth) {
    shown = shown.slice(0, -1)
  }
  return `${shown}...`
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
 * Ajoute l’image de signature et la mention en français sur la première page (coin bas-gauche).
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
  const maxTextWidth = Math.max(120, width - imgX - margin)
  const lines = signatureStampLines(email, signedAtIso)
  let textSize = 9
  while (
    textSize > 6.5 &&
    lines.some((line) => font.widthOfTextAtSize(line, textSize) > maxTextWidth)
  ) {
    textSize -= 0.5
  }
  const color = rgb(0.15, 0.15, 0.15)
  lines.forEach((line, index) => {
    const shown = fitStampLine(font, line, textSize, maxTextWidth)
    page.drawText(shown, {
      x: imgX,
      y: imgY - 14 - index * (textSize + 3),
      size: textSize,
      font,
      color,
    })
  })

  return doc.save()
}
