import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceData } from "../types"
import { validateDecennaleQuote } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"
import { PROTECTION_JURIDIQUE_GARANTIE_EUR } from "@/lib/legal-protection"
import { DEVOIR_CONSEIL_TEXT, DEVOIR_CONSEIL_USEFUL_LINKS_LINE } from "@/lib/devoir-conseil"

const QUOTE_VALIDITY_DAYS = 30

/**
 * Devis décennale — pdf-lib, mentions légales Accelerant / délégation (pied de page).
 */
export async function generateDecennaleQuote(data: InsuranceData): Promise<Uint8Array> {
  validateDecennaleQuote(data)

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "DEVIS — Assurance responsabilité civile décennale",
    "Assurance décennale professionnelle",
    accelerantLogo
  )

  drawTextPdf(page, `N° ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 10,
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
    "Assureur : Accelerant Insurance — Distribution : Optimum Courtage (ORIAS LPS 28931947).",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    9,
    12,
    PDF_COLORS.muted
  )
  y -= 16

  drawTextPdf(page, "Client", { x: PDF_PAGE.marginX, y, size: 11, font: fontBold, color: PDF_COLORS.text })
  y -= 14
  y = drawWrappedText(page, data.clientName, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  if (data.siret) {
    y -= 4
    y = drawWrappedText(page, `SIRET : ${data.siret}`, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  }
  y -= 8
  y = drawWrappedText(page, data.address, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  y -= 18

  drawTextPdf(page, "Activités déclarées", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page,
    data.activities!.join(", "),
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    10,
    13
  )
  y -= 18

  drawTextPdf(page, "Prime TTC (indicative)", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  page.drawText(formatEuro(data.premium), {
    x: PDF_PAGE.marginX,
    y,
    size: 12,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  y -= 20

  drawTextPdf(
    page,
    `Protection juridique : ${PROTECTION_JURIDIQUE_GARANTIE_EUR.toLocaleString("fr-FR")} €.`,
    {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
    }
  )
  y -= 18

  drawTextPdf(page, `Validité du devis : ${QUOTE_VALIDITY_DAYS} jours à compter de la date d'émission.`, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page,
    "Devis non contractuel soumis à validation assureur.",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    fontBold,
    10,
    13,
    PDF_COLORS.primary
  )
  y -= 12
  y = drawWrappedText(page, ANTI_FRAUD_LINE, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 9, 12, PDF_COLORS.muted)
  y -= 14
  y = drawWrappedText(
    page,
    `CGV et conditions d’émission des attestations : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    8,
    11,
    PDF_COLORS.muted
  )

  // Page 2 : annexe informative pour détailler le devis
  const page2 = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  let y2 = drawOptimumHeader(
    page2,
    font,
    fontBold,
    "DEVIS — Annexe informative",
    "Portée, obligations et étapes de souscription",
    accelerantLogo
  )

  drawTextPdf(page2, `Référence devis : ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y: y2,
    size: 10,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y2 -= 18

  const details: string[] = [
    "1) Portée de la proposition : ce devis est indicatif et établi sur la base des informations déclarées par le souscripteur.",
    "2) Activités couvertes : seules les activités mentionnées au devis sont prises en compte lors de l’émission du contrat.",
    "3) Exclusions : les activités non déclarées, exclusions techniques prévues aux conditions générales, et sinistres hors champ légal ne sont pas couverts.",
    "4) Franchise et plafonds : fixés aux conditions particulières lors de l’émission du contrat après validation du risque.",
    "5) Paiement : le contrat n’est effectif qu’après signature électronique et encaissement selon le parcours de paiement prévu.",
    "6) Pièces et conformité : des justificatifs complémentaires peuvent être exigés avant l’émission définitive (Kbis, identité, antécédents, etc.).",
    "7) Déclaration du risque : toute information inexacte ou omission significative peut entraîner révision, exclusion, résiliation ou nullité selon le cadre contractuel.",
    "8) Validité : la proposition est valable 30 jours, sauf évolution du risque déclaré ou des conditions techniques de souscription.",
    `9) Protection juridique : garantie défense/recours incluse, plafonnée à ${PROTECTION_JURIDIQUE_GARANTIE_EUR.toLocaleString("fr-FR")} € par litige couvert.`,
  ]

  for (const line of details) {
    y2 = drawWrappedText(page2, line, PDF_PAGE.marginX, y2, PDF_PAGE.contentWidth, font, 9, 12)
    y2 -= 8
  }

  y2 -= 2
  y2 = drawWrappedText(
    page2,
    `Devoir de conseil : ${DEVOIR_CONSEIL_TEXT.decennale}`,
    PDF_PAGE.marginX,
    y2,
    PDF_PAGE.contentWidth,
    font,
    9,
    12
  )
  y2 -= 8
  y2 = drawWrappedText(
    page2,
    DEVOIR_CONSEIL_USEFUL_LINKS_LINE,
    PDF_PAGE.marginX,
    y2,
    PDF_PAGE.contentWidth,
    font,
    8,
    11,
    PDF_COLORS.muted
  )
  y2 -= 10
  y2 = drawWrappedText(
    page2,
    "Souscription : ce document ne vaut pas attestation. La couverture démarre uniquement après validation et émission des pièces contractuelles.",
    PDF_PAGE.marginX,
    y2,
    PDF_PAGE.contentWidth,
    fontBold,
    9,
    12,
    PDF_COLORS.primary
  )
  y2 -= 10
  y2 = drawWrappedText(
    page2,
    `Références : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
    PDF_PAGE.marginX,
    y2,
    PDF_PAGE.contentWidth,
    font,
    8,
    11,
    PDF_COLORS.muted
  )
  y2 -= 10
  drawWrappedText(page2, ANTI_FRAUD_LINE, PDF_PAGE.marginX, y2, PDF_PAGE.contentWidth, font, 8, 11, PDF_COLORS.muted)

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
