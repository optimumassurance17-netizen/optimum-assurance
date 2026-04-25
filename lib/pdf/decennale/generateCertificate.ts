import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceCertificateData } from "../types"
import { validateCertificateData } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, ATTESTATION_WARNING, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawAttestationStampBottomRight, loadAttestationStampImage } from "../shared/attestationStamp"
import { embedVerificationQr } from "../shared/qrCode"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"

/**
 * Attestation décennale — RC décennale, articles 1792, QR vérification.
 */
export async function generateDecennaleCertificate(data: InsuranceCertificateData): Promise<Uint8Array> {
  if (data.productType !== "decennale") {
    throw new Error("generateDecennaleCertificate : productType doit être decennale")
  }
  validateCertificateData(data)
  const activities =
    data.activitiesHierarchy && data.activitiesHierarchy.length > 0
      ? data.activitiesHierarchy
      : (data.activities ?? [])

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])

  const verifyUrl = `${SITE_URL}/verify/${encodeURIComponent(data.contractNumber)}`
  const qrImage = await embedVerificationQr(pdfDoc, verifyUrl)
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "ATTESTATION D’ASSURANCE — Responsabilité civile décennale",
    "Document officiel",
    accelerantLogo
  )

  drawTextPdf(page, `N° ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page, `Émis le ${formatGeneratedAt(data.createdAt)}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })
  y -= 22

  y = drawWrappedText(
    page,
    "La présente attestation est établie pour justifier de l’assurance obligatoire prévue à l’article L. 241-1 du Code des assurances, au titre des articles 1792 à 1792-2 du Code civil.",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    9,
    12
  )
  y -= 14

  drawTextPdf(page, "Assuré", { x: PDF_PAGE.marginX, y, size: 11, font: fontBold, color: PDF_COLORS.text })
  y -= 14
  y = drawWrappedText(page, data.clientName, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  if (data.siret) {
    y -= 4
    y = drawWrappedText(page, `SIRET : ${data.siret}`, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  }
  y -= 8
  y = drawWrappedText(page, data.address, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  y -= 16

  drawTextPdf(page, "Couverture : RC décennale", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page,
    `Activité(s) assurée(s) : ${activities.join("\n")}.`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    10,
    13
  )
  y -= 14
  if (data.activityExclusions?.length) {
    y = drawWrappedText(
      page,
      `Exclusion(s) d'activité : ${data.activityExclusions.join(", ")}.`,
      PDF_PAGE.marginX,
      y,
      PDF_PAGE.contentWidth,
      font,
      10,
      13
    )
    y -= 14
  }
  y = drawWrappedText(
    page,
    `Période de validité : du ${data.startDate} au ${data.endDate}.`,
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
    `Prime annuelle TTC : ${formatEuro(data.premium)}.`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    10,
    13
  )
  y -= 18

  drawTextPdf(page, "Conditions d'effet", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page,
    "Paiement reçu — risque accepté par l’assureur — pièces conformes.",
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

  const stamp = await loadAttestationStampImage(pdfDoc)
  if (stamp) drawAttestationStampBottomRight(page, stamp)

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
