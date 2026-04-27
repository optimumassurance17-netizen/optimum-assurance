import { readFile } from "fs/promises"
import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib"
import { PDF_PAGE } from "./pdfLayout"

const STAMP_FILE_URL = new URL("../../../public/branding/optimum-delegation-stamp.png", import.meta.url)

/** ~43 mm — tampon lisible, au-dessus du pied de page légal */
export const ATTESTATION_STAMP_MAX_WIDTH_PT = 122

/**
 * Tampon « OPTIMUM / Par délégation / ACCELERANT… » pour attestations PDF.
 */
export async function loadAttestationStampImage(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const buf = await readFile(STAMP_FILE_URL)
    return await pdf.embedPng(buf)
  } catch {
    return null
  }
}

/**
 * Place le tampon en bas à droite, au-dessus du bandeau pied de page (ORIAS / pagination).
 */
export function drawAttestationStampBottomRight(page: PDFPage, stamp: PDFImage): void {
  const pageW = PDF_PAGE.width
  const maxW = Math.min(ATTESTATION_STAMP_MAX_WIDTH_PT, PDF_PAGE.contentWidth * 0.4)
  const drawW = maxW
  const drawH = (stamp.height / stamp.width) * drawW
  const pad = PDF_PAGE.marginX
  /** Bas du visuel : au-dessus des lignes de pied (y ≈ 46–56) */
  const stampBottomY = 80
  const x = pageW - pad - drawW
  page.drawImage(stamp, { x, y: stampBottomY, width: drawW, height: drawH })
}
