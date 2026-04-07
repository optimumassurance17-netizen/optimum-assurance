import { readFile } from "fs/promises"
import path from "path"
import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib"
import { ACCELERANT_LOGO_WIDTH_PT } from "./accelerantLogoDataUri"
import { PDF_PAGE } from "./pdfLayout"

const LOGO_PATH_SEGMENTS = ["public", "branding", "accelerant-logo.png"] as const

/**
 * Charge le PNG Accelerant depuis `public/branding/accelerant-logo.png`.
 * Retourne `null` si fichier absent (build partiel, pas de crash PDF).
 */
export async function loadAccelerantLogoImage(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const fp = path.join(process.cwd(), ...LOGO_PATH_SEGMENTS)
    const buf = await readFile(fp)
    return await pdf.embedPng(buf)
  } catch {
    return null
  }
}

/**
 * Logo centré en tête de page. Retourne l’ordonnée du bas du visuel (pdf-lib).
 */
export function drawAccelerantLogoOnPage(page: PDFPage, image: PDFImage): { imgBottom: number } {
  const pageW = PDF_PAGE.width
  const pageH = PDF_PAGE.height
  const maxW = Math.min(ACCELERANT_LOGO_WIDTH_PT, PDF_PAGE.contentWidth * 0.92)
  const drawH = (image.height / image.width) * maxW
  const topInset = 16
  const imgBottom = pageH - topInset - drawH
  page.drawImage(image, {
    x: (pageW - maxW) / 2,
    y: imgBottom,
    width: maxW,
    height: drawH,
  })
  return { imgBottom }
}
