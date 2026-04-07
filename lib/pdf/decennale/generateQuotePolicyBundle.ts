import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import { contractBundleLegalParagraphs } from "@/lib/legal-branding"
import { PROTECTION_JURIDIQUE_GARANTIE_EUR } from "@/lib/legal-protection"
import type { InsuranceData } from "../types"
import { validateDecennaleQuote } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { ANTI_FRAUD_LINE, PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"

const QUOTE_VALIDITY_DAYS = 30

export type DecennaleQuotePolicyBundleMode = "proposition" | "contrat"

/**
 * PDF unique : devis décennale + conditions particulières.
 * Mode `contrat` : titres adaptés + page de mentions légales (contrat actif).
 */
export async function generateDecennaleQuotePolicyBundle(
  data: InsuranceData,
  mode: DecennaleQuotePolicyBundleMode
): Promise<Uint8Array> {
  validateDecennaleQuote(data)

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  const page1 = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  const devisTitle =
    mode === "contrat"
      ? "CONTRAT D’ASSURANCE — Responsabilité civile décennale"
      : "DEVIS — Assurance responsabilité civile décennale"
  const devisSub =
    mode === "contrat"
      ? "Document unique : devis et conditions particulières"
      : "Assurance décennale professionnelle"

  let y = drawOptimumHeader(page1, font, fontBold, devisTitle, devisSub, accelerantLogo)

  drawTextPdf(page1, `N° ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 10,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page1, `Émis le ${formatGeneratedAt(data.createdAt)}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })
  y -= 22

  y = drawWrappedText(
    page1,
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

  drawTextPdf(page1, "Client", { x: PDF_PAGE.marginX, y, size: 11, font: fontBold, color: PDF_COLORS.text })
  y -= 14
  y = drawWrappedText(page1, data.clientName, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, fontBold, 10, 13)
  if (data.siret) {
    y -= 4
    y = drawWrappedText(page1, `SIRET : ${data.siret}`, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  }
  y -= 8
  y = drawWrappedText(page1, data.address, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 10, 13)
  y -= 18

  drawTextPdf(page1, "Activités déclarées", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page1,
    data.activities!.join(", "),
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    10,
    13
  )
  y -= 18

  drawTextPdf(page1, "Prime TTC (indicative)", {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page1, formatEuro(data.premium), {
    x: PDF_PAGE.marginX,
    y,
    size: 12,
    font: fontBold,
    color: PDF_COLORS.primary,
  })
  y -= 20
  drawTextPdf(
    page1,
    `Protection juridique incluse : ${PROTECTION_JURIDIQUE_GARANTIE_EUR.toLocaleString("fr-FR")} € de garantie.`,
    {
      x: PDF_PAGE.marginX,
      y,
      size: 9,
      font,
      color: PDF_COLORS.muted,
    }
  )
  y -= 16

  if (mode === "proposition") {
    drawTextPdf(page1, `Validité du devis : ${QUOTE_VALIDITY_DAYS} jours à compter de la date d'émission.`, {
      x: PDF_PAGE.marginX,
      y,
      size: 9,
      font: fontBold,
      color: PDF_COLORS.text,
    })
    y -= 14
    y = drawWrappedText(
      page1,
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
  } else {
    y = drawWrappedText(
      page1,
      "Le présent document matérialise le contrat d’assurance souscrit ; il s’applique conjointement aux conditions générales, sous réserve de la prise d’effet et du paiement conforme aux modalités convenues.",
      PDF_PAGE.marginX,
      y,
      PDF_PAGE.contentWidth,
      fontBold,
      10,
      13,
      PDF_COLORS.primary
    )
    y -= 12
  }

  y = drawWrappedText(page1, ANTI_FRAUD_LINE, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 9, 12, PDF_COLORS.muted)
  y -= 14
  y = drawWrappedText(
    page1,
    `CGV et conditions d’émission des attestations : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    8,
    11,
    PDF_COLORS.muted
  )

  const page2 = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  const cpTitle =
    mode === "contrat"
      ? "CONDITIONS PARTICULIÈRES — Assurance décennale (contrat)"
      : "CONDITIONS PARTICULIÈRES — Assurance décennale"
  const cpSub = mode === "contrat" ? "Intégrées au document unique avec le devis" : "Contrat RC décennale"

  y = drawOptimumHeader(page2, font, fontBold, cpTitle, cpSub, accelerantLogo)

  drawTextPdf(page2, `Contrat N° ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page2, `Document généré le ${formatGeneratedAt(data.createdAt)}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 9,
    font,
    color: PDF_COLORS.muted,
  })
  y -= 20

  const clauses: string[] = [
    "Assureur : Accelerant Insurance.",
    "Courtier : Optimum Courtage, ORIAS LPS 28931947.",
    "Optimum Courtage agit par délégation de Accelerant Insurance.",
    `Assuré : ${data.clientName}${data.siret ? ` — SIRET ${data.siret}` : ""}.`,
    `Adresse : ${data.address}.`,
    `Période : du ${data.startDate} au ${data.endDate}.`,
    `Activités garanties : ${data.activities!.join(", ")}.`,
    `Prime annuelle TTC : ${formatEuro(data.premium)}.`,
    `Protection juridique : garantie plafonnée à ${PROTECTION_JURIDIQUE_GARANTIE_EUR.toLocaleString("fr-FR")} € par litige couvert.`,
    "Paiement : prélèvement SEPA selon mandat et échéances contractuelles.",
    "Le souscripteur atteste l’exactitude de ses déclarations. Signature et paiement valent engagement sous réserve d’acceptation du risque par l’assureur.",
    `Conditions générales et attestations : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
  ]

  for (const c of clauses) {
    y = drawWrappedText(page2, c, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 9, 12)
    y -= 8
  }

  if (mode === "contrat") {
    let ap = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
    y = drawOptimumHeader(
      ap,
      font,
      fontBold,
      "MENTIONS LÉGALES ET CONTRACTUELLES",
      "Document devis et conditions particulières — contrat en vigueur",
      accelerantLogo
    )
    y -= 8
    for (const para of contractBundleLegalParagraphs("decennale")) {
      if (y < 120) {
        ap = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
        y = drawOptimumHeader(ap, font, fontBold, "MENTIONS (suite)", "", accelerantLogo)
        y -= 8
      }
      y = drawWrappedText(ap, para, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 9, 12, PDF_COLORS.text)
      y -= 12
    }
  }

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
