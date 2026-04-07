import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceData } from "../types"
import { validateDoQuote } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"
import { PROTECTION_JURIDIQUE_GARANTIE_EUR } from "@/lib/legal-protection"

const QUOTE_VALIDITY_DAYS = 30

export async function generateDOQuote(data: InsuranceData): Promise<Uint8Array> {
  validateDoQuote(data)

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "DEVIS — Assurance dommages-ouvrage",
    "Construction / maître d’ouvrage",
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

  drawTextPdf(page, "Maître d'ouvrage / client", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(page, data.clientName, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  y -= 8
  y = drawWrappedText(page, data.address, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  y -= 18

  drawTextPdf(page, "Opération de construction", {
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
      `Nature des travaux : ${data.constructionNature}`,
      PDF_PAGE.marginX,
      y,
      PDF_PAGE.contentWidth,
      font,
      10,
      13
    )
  }
  y -= 18

  drawTextPdf(page, "Prime TTC (indicative)", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page, formatEuro(data.premium), {
    x: PDF_PAGE.marginX,
    y,
    size: 12,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  y -= 16
  drawTextPdf(page, "Franchise : aucune (garantie obligatoire DO).", {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })
  y -= 14
  drawTextPdf(
    page,
    `Protection juridique : ${PROTECTION_JURIDIQUE_GARANTIE_EUR.toLocaleString("fr-FR")} € (défense/recours).`,
    {
      x: PDF_PAGE.marginX,
      y,
      size: 9,
      font,
      color: PDF_COLORS.muted,
    }
  )
  y -= 20

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
    `CG dommage ouvrage : ${SITE_URL}/conditions-generales-dommage-ouvrage — CGV : ${SITE_URL}/cgv — attestations : ${SITE_URL}/conditions-attestations`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    8,
    11,
    PDF_COLORS.muted
  )

  // Page 2 : annexe informative détaillée
  const page2 = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  let y2 = drawOptimumHeader(
    page2,
    font,
    fontBold,
    "DEVIS DO — Annexe informative",
    "Portée de la garantie et obligations du souscripteur",
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
    "1) Objet de la DO : préfinancer les réparations relevant de la garantie décennale, sans attendre la détermination définitive des responsabilités.",
    "2) Périmètre : dommages compromettant la solidité de l’ouvrage ou l’affectant dans sa destination, selon les conditions contractuelles.",
    "3) Exclusions usuelles : usure normale, défaut d’entretien, dommages purement esthétiques isolés et cas exclus aux conditions générales.",
    `4) Protection juridique : défense et recours à hauteur de ${PROTECTION_JURIDIQUE_GARANTIE_EUR.toLocaleString("fr-FR")} € (selon conditions contractuelles).`,
    "5) Déclarations techniques : le souscripteur doit communiquer des informations exactes (nature des travaux, destination, intervenants, montants).",
    "6) Pièces dossier : l’assureur peut demander des documents complémentaires (plans, permis, pièces entreprises, attestations techniques).",
    "7) Déclaration de sinistre : à formuler par écrit, avec date d’apparition, description, éléments techniques et pièces justificatives.",
    "8) Validité du devis : 30 jours sous réserve de stabilité des éléments techniques et économiques transmis.",
  ]

  for (const line of details) {
    y2 = drawWrappedText(page2, line, PDF_PAGE.marginX, y2, PDF_PAGE.contentWidth, font, 9, 12)
    y2 -= 8
  }

  y2 -= 2
  y2 = drawWrappedText(
    page2,
    "Important : ce devis ne vaut pas contrat ni attestation. La couverture débute après validation du risque et émission des pièces contractuelles.",
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
    `Références : ${SITE_URL}/conditions-generales-dommage-ouvrage — ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
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
