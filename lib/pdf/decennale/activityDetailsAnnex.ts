import type { PDFDocument, PDFImage, PDFFont, PDFPage } from "pdf-lib"
import {
  buildActivityDocumentDetails,
  type ActivityDocumentDetail,
} from "@/lib/activity-document-details"
import { drawOptimumHeader } from "@/lib/pdf/shared/drawHeader"
import { PDF_COLORS, PDF_PAGE } from "@/lib/pdf/shared/pdfLayout"
import { drawTextPdf, drawWrappedText } from "@/lib/pdf/shared/pdfUtils"

type ActivityDetailsAnnexOptions = {
  pdfDoc: PDFDocument
  font: PDFFont
  fontBold: PDFFont
  accelerantLogo?: PDFImage | null
  activities: string[]
  documentLabel: string
}

function drawActivityDetailBlock(
  page: PDFPage,
  detail: ActivityDocumentDetail,
  yStart: number,
  font: PDFFont,
  fontBold: PDFFont
): number {
  let y = yStart
  const title = `${detail.activityLabel}${detail.code ? ` (Code ${detail.code})` : ""}`
  drawTextPdf(page, title, {
    x: PDF_PAGE.marginX,
    y,
    size: 10,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  y = drawWrappedText(
    page,
    `Definition : ${detail.definition}`,
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    font,
    9,
    12
  )
  y -= 4
  y = drawWrappedText(
    page,
    "Exclusions specifiques :",
    PDF_PAGE.marginX,
    y,
    PDF_PAGE.contentWidth,
    fontBold,
    9,
    12
  )
  y -= 2
  for (const exclusion of detail.exclusions) {
    y = drawWrappedText(
      page,
      `- ${exclusion}`,
      PDF_PAGE.marginX + 8,
      y,
      PDF_PAGE.contentWidth - 8,
      font,
      8.5,
      11
    )
    y -= 2
  }
  return y - 8
}

export function appendDecennaleActivityDetailsAnnex(
  options: ActivityDetailsAnnexOptions
): void {
  const { pdfDoc, font, fontBold, accelerantLogo, activities, documentLabel } =
    options
  const details = buildActivityDocumentDetails(activities)
  if (details.length === 0) return

  const newPage = (isContinuation: boolean) => {
    const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
    const title = isContinuation
      ? `ANNEXE ${documentLabel.toUpperCase()} (suite)`
      : `ANNEXE ${documentLabel.toUpperCase()}`
    let y = drawOptimumHeader(
      page,
      font,
      fontBold,
      title,
      "Definitions et exclusions par activite declaree",
      accelerantLogo
    )
    if (!isContinuation) {
      y = drawWrappedText(
        page,
        "Cette annexe reproduit la definition nomenclature et les exclusions specifiques de chaque activite declaree.",
        PDF_PAGE.marginX,
        y,
        PDF_PAGE.contentWidth,
        font,
        9,
        12,
        PDF_COLORS.muted
      )
      y -= 10
    }
    return { page, y }
  }

  let { page, y } = newPage(false)
  const minY = PDF_PAGE.marginBottom + 34

  for (const detail of details) {
    const estimatedLines =
      4 + Math.max(2, detail.exclusions.length * 2) + Math.ceil(detail.definition.length / 110)
    const estimatedHeight = estimatedLines * 11 + 20
    if (y - estimatedHeight < minY) {
      ;({ page, y } = newPage(true))
    }
    y = drawActivityDetailBlock(page, detail, y, font, fontBold)
    if (y < minY) {
      ;({ page, y } = newPage(true))
    }
  }
}
