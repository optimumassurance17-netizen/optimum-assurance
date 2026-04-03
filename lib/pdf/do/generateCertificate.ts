import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceCertificateData } from "../types"
import { validateCertificateData } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, ATTESTATION_WARNING, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { embedVerificationQr } from "../shared/qrCode"
import { drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"

/**
 * Attestation DO — projet, adresse, nature construction, QR.
 */
export async function generateDOCertificate(data: InsuranceCertificateData): Promise<Uint8Array> {
  if (data.productType !== "do") {
    throw new Error("generateDOCertificate : productType doit être do")
  }
  validateCertificateData(data)

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])

  const verifyUrl = `${SITE_URL}/verify/${encodeURIComponent(data.contractNumber)}`
  const qrImage = await embedVerificationQr(pdfDoc, verifyUrl)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "ATTESTATION D’ASSURANCE — Dommages-ouvrage",
    "Document officiel"
  )

  page.drawText(`N° ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  page.drawText(`Émis le ${formatGeneratedAt(data.createdAt)}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })
  y -= 22

  y = drawWrappedText(
    page,
    "La présente attestation est établie pour justifier de l’assurance obligatoire prévue aux articles L. 242-1 et L. 242-2 du Code des assurances.",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    9,
    12
  )
  y -= 14

  page.drawText("Assuré", { x: PDF_PAGE.marginX, y, size: 11, font: fontBold, color: PDF_COLORS.text })
  y -= 14
  y = drawWrappedText(page, data.clientName, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  y -= 8
  y = drawWrappedText(page, data.address, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  y -= 16

  page.drawText("Projet de construction", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(page, data.projectName!, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  y -= 8
  y = drawWrappedText(page, data.projectAddress!, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  if (data.constructionNature) {
    y -= 8
    y = drawWrappedText(
      page,
      `Nature : ${data.constructionNature}`,
      PDF_PAGE.marginX,
      y,
      PDF_PAGE.contentWidth,
      font,
      10,
      13
    )
  }
  y -= 14
  y = drawWrappedText(
    page,
    `Validité : du ${data.startDate} au ${data.endDate}.`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    10,
    13
  )
  y -= 12
  y = drawWrappedText(
    page,
    `Prime TTC : ${formatEuro(data.premium)}.`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    10,
    13
  )
  y -= 12
  y = drawWrappedText(
    page,
    "Franchise : aucune (garantie obligatoire dommages-ouvrage).",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    9,
    12,
    PDF_COLORS.muted
  )
  y -= 18

  page.drawText("Conditions d’effet", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page,
    "Paiement reçu — risque accepté par l’assureur — dossier technique conforme.",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    9,
    12
  )
  y -= 12
  y = drawWrappedText(page, ANTI_FRAUD_LINE, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 9, 12, PDF_COLORS.primary)
  y -= 10
  y = drawWrappedText(page, ATTESTATION_WARNING, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 9, 12)
  y -= 16

  const qrSize = 100
  page.drawImage(qrImage, {
    x: PDF_PAGE.marginX,
    y: y - qrSize,
    width: qrSize,
    height: qrSize,
  })
  y = y - qrSize - 8
  y = drawWrappedText(
    page,
    `Vérification : ${verifyUrl}`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    8,
    10,
    PDF_COLORS.muted
  )

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
