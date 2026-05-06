import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceCertificateData } from "../types"
import { validateCertificateData } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, ATTESTATION_WARNING, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { embedVerificationQr } from "../shared/qrCode"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"
import { appendDecennaleActivityDetailsAnnex } from "./activityDetailsAnnex"

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
  const activityLines = activities.length > 0 ? activities : ["Activité déclarée au contrat"]
  const optimizedExclusions = extractOptimizedExclusionLines({
    activityExclusions: data.activityExclusions,
  })

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
  drawTextPdf(page, "Activités assurées :", {
    x: PDF_PAGE.marginX,
    y,
    size: 10,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  for (const activity of activityLines) {
    y = drawWrappedText(
      page,
      `• ${activity}`,
      PDF_PAGE.marginX,
      y,
      PDF_PAGE.contentWidth,
      font,
      10,
      13
    )
    y -= 4
  }
  y -= 10
  if (optimizedExclusions.length > 0) {
    y = drawWrappedText(
      page,
      `Ne sont pas couverts : ${optimizedExclusions.join(" ; ")}.`,
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

  const signatureTopY = Math.max(y + 26, 152)
  const signatureX = PDF_PAGE.width - PDF_PAGE.marginX - 180
  drawTextPdf(page, "Signature autorisée", {
    x: signatureX,
    y: signatureTopY,
    size: 9,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  drawTextPdf(page, "Service émission attestations", {
    x: signatureX,
    y: signatureTopY - 14,
    size: 8,
    font,
    color: PDF_COLORS.muted,
  })
  drawTextPdf(page, "Optimum Assurance", {
    x: signatureX,
    y: signatureTopY - 25,
    size: 8,
    font,
    color: PDF_COLORS.muted,
  })

  appendDecennaleActivityDetailsAnnex({
    pdfDoc,
    font,
    fontBold,
    accelerantLogo,
    activities,
    documentLabel: "attestation",
  })

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
