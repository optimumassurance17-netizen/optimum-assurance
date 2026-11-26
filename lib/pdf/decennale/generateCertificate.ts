import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceCertificateData } from "../types"
import { validateCertificateData } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, ATTESTATION_WARNING, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawAttestationQrRow, embedVerificationQr } from "../shared/qrCode"
import { sanitizeForPdfLib } from "../shared/sanitizePdfText"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt, wrapLines } from "../shared/pdfUtils"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"
import { decennaleGarantieRows } from "@/lib/decennale-garanties-affichage"
import { DECENNALE_SOUS_TRAITANCE_ATTESTATION, decennaleCadreCompletLines } from "@/lib/conditions-particulieres"
import { drawClausesPaginated } from "../shared/drawClauses"
import { appendDecennaleActivityDetailsAnnex } from "./activityDetailsAnnex"

/**
 * Attestation décennale — RC décennale, articles 1792, QR vérification.
 */
export async function generateDecennaleCertificate(data: InsuranceCertificateData): Promise<Uint8Array> {
  if (data.productType !== "decennale") {
    throw new Error("generateDecennaleCertificate : productType doit être decennale")
  }
  validateCertificateData(data)
  const certificateActive = data.paymentConfirmed && data.insurerValidated
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
  let page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])

  const verifyUrl = `${SITE_URL}/verify/${encodeURIComponent(data.contractNumber)}`
  const qrImage = await embedVerificationQr(pdfDoc, verifyUrl)
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    certificateActive
      ? "ATTESTATION D’ASSURANCE — Responsabilité civile décennale"
      : "DOCUMENT DE SUIVI — Responsabilité civile décennale",
    certificateActive ? "Document officiel" : "Non payé / non actif",
    accelerantLogo
  )
  y = drawAttestationQrRow(page, qrImage, font, fontBold, y, verifyUrl)
  if (!certificateActive) {
    y = drawWrappedText(
      page,
      "STATUT : NON PAYE / NON ACTIF — ce document ne vaut pas attestation définitive. L’attestation décennale devient valable uniquement après paiement, contrôle du dossier et acceptation du risque.",
      PDF_PAGE.marginX,
      y,
      PDF_PAGE.contentWidth,
      fontBold,
      10,
      13,
      PDF_COLORS.primary
    )
    y -= 8
  }

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

  /** Hauteur du bloc tampon, du titre jusqu'au-dessus du pied de page. */
  const SIGNATURE_BLOCK_HEIGHT = 90
  const continueAttestation = (subtitle: string) => {
    page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
    y = drawOptimumHeader(page, font, fontBold, "ATTESTATION — suite", subtitle, accelerantLogo)
  }
  const drawFlow = (
    text: string,
    usedFont: typeof font,
    size: number,
    lineHeight: number,
    color = PDF_COLORS.text,
    subtitle = "Suite",
    x = PDF_PAGE.marginX,
    maxWidth = PDF_PAGE.contentWidth
  ) => {
    const lines = wrapLines(sanitizeForPdfLib(text), maxWidth, usedFont, size)
    for (const line of lines) {
      if (y < PDF_PAGE.marginBottom + lineHeight) continueAttestation(subtitle)
      drawTextPdf(page, line, { x, y, size, font: usedFont, color, maxWidth })
      y -= lineHeight
    }
  }

  if (y < PDF_PAGE.marginBottom + 48) continueAttestation("Activités")
  drawTextPdf(page, "Couverture : RC décennale", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  if (y < PDF_PAGE.marginBottom + 28) continueAttestation("Activités")
  drawTextPdf(page, "Activités assurées :", {
    x: PDF_PAGE.marginX,
    y,
    size: 10,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  for (const activity of activityLines) {
    drawFlow(`• ${activity}`, font, 10, 13, PDF_COLORS.text, "Activités")
    y -= 4
  }
  y -= 6
  drawFlow(DECENNALE_SOUS_TRAITANCE_ATTESTATION, fontBold, 10, 13, PDF_COLORS.text, "Activités")
  y -= 10
  if (optimizedExclusions.length > 0) {
    drawFlow(
      `Ne sont pas couverts : ${optimizedExclusions.join(" ; ")}.`,
      font,
      10,
      13,
      PDF_COLORS.text,
      "Activités"
    )
    y -= 14
  }
  drawFlow(
    `Période de validité : du ${data.startDate} au ${data.endDate}.`,
    font,
    10,
    13,
    PDF_COLORS.text,
    "Activités"
  )
  y -= 12
  drawFlow(`Prime annuelle TTC : ${formatEuro(data.premium)}.`, font, 10, 13, PDF_COLORS.text, "Activités")
  y -= 14
  if (y < PDF_PAGE.marginBottom + 140) continueAttestation("Garanties")
  drawTextPdf(page, "Garanties, montants et franchise", {
    x: PDF_PAGE.marginX,
    y,
    size: 14,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 18
  for (const row of decennaleGarantieRows({})) {
    if (y < PDF_PAGE.marginBottom + 80) continueAttestation("Garanties")
    drawFlow(
      `${row.nom} — plafond ${row.plafond} — franchise ${row.franchise}`,
      fontBold,
      13,
      16,
      PDF_COLORS.text,
      "Garanties"
    )
    drawFlow(row.description, font, 10, 13, PDF_COLORS.text, "Garanties")
    y -= 8
  }
  {
    const continued = drawClausesPaginated({
      pdfDoc,
      page,
      y,
      font,
      fontBold,
      logo: accelerantLogo,
      clauses: decennaleCadreCompletLines(),
      continuationTitle: "ATTESTATION — conditions particulières (suite)",
    })
    page = continued.page
    y = continued.y
  }
  y -= 10

  const closingHeight = 14 + 36 + 12 + 36 + 10 + 24 + 12 + SIGNATURE_BLOCK_HEIGHT
  if (y < PDF_PAGE.marginBottom + closingHeight) continueAttestation("Conditions d'effet")

  drawTextPdf(page, "Conditions d'effet", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawFlow(
    certificateActive
      ? "Paiement reçu — risque accepté par l’assureur — pièces conformes."
      : "Paiement non reçu ou validation non finalisée — document non actif.",
    font,
    9,
    12,
    PDF_COLORS.text,
    "Conditions d'effet"
  )
  y -= 12
  drawFlow(ANTI_FRAUD_LINE, fontBold, 9, 12, PDF_COLORS.primary, "Conditions d'effet")
  y -= 10
  drawFlow(ATTESTATION_WARNING, fontBold, 9, 12, PDF_COLORS.text, "Conditions d'effet")
  y -= 12

  if (y < PDF_PAGE.marginBottom + SIGNATURE_BLOCK_HEIGHT) continueAttestation("Signature")
  const signatureTopY = y
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
  drawTextPdf(page, "TAMPON ASSUREUR", {
    x: signatureX,
    y: signatureTopY - 40,
    size: 8,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  drawWrappedText(
    page,
    "OPTIMUM COURTAGE — Par délégation ACCELERANT INSURANCE",
    signatureX,
    signatureTopY - 48,
    180,
    font,
    7,
    10,
    PDF_COLORS.muted
  )

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
