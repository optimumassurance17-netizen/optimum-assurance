import { PDFDocument, type PDFFont, type PDFPage } from "pdf-lib"
import { embedStandardFonts } from "../shared/initPdf"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText } from "../shared/pdfUtils"

export const PV_RECEPTION_VIERGE_FILENAME = "pv-reception-vierge.pdf"

const BLANK = "................................................................"

type DrawState = {
  pdf: PDFDocument
  page: PDFPage
  font: PDFFont
  fontBold: PDFFont
  y: number
}

function ensureRoom(state: DrawState, needed: number): void {
  if (state.y - needed > PDF_PAGE.marginBottom) return
  state.page = state.pdf.addPage([PDF_PAGE.width, PDF_PAGE.height])
  state.y = PDF_PAGE.height - PDF_PAGE.marginTop
}

function paragraph(state: DrawState, text: string, size = 10, bold = false): void {
  ensureRoom(state, 48)
  state.y = drawWrappedText(
    state.page,
    text,
    PDF_PAGE.marginX,
    state.y,
    PDF_PAGE.contentWidth,
    bold ? state.fontBold : state.font,
    size,
    size + 4,
    bold ? PDF_COLORS.primary : PDF_COLORS.text
  )
  state.y -= 8
}

function blankField(state: DrawState, label: string, lines = 1): void {
  ensureRoom(state, 18 + lines * 18)
  drawTextPdf(state.page, label, {
    x: PDF_PAGE.marginX,
    y: state.y,
    size: 10,
    font: state.fontBold,
    color: PDF_COLORS.text,
  })
  state.y -= 16
  for (let index = 0; index < lines; index += 1) {
    ensureRoom(state, 18)
    drawTextPdf(state.page, BLANK, {
      x: PDF_PAGE.marginX,
      y: state.y,
      size: 11,
      font: state.font,
      color: PDF_COLORS.muted,
    })
    state.y -= 18
  }
  state.y -= 6
}

/**
 * Modèle vierge de procès-verbal de réception.
 * Aucune donnée de dossier n'est imprimée : les cases restent à remplir à la fin du chantier.
 */
export async function generatePvReceptionVierge(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdf)
  const state: DrawState = {
    pdf,
    page: pdf.addPage([PDF_PAGE.width, PDF_PAGE.height]),
    font,
    fontBold,
    y: PDF_PAGE.height - PDF_PAGE.marginTop,
  }

  paragraph(state, "Procès-verbal de réception", 16, true)
  paragraph(state, "Modèle vierge — à compléter à la fin du chantier", 11, true)
  paragraph(
    state,
    "Ce document n'est pas une attestation d'assurance. Il constate la réception des travaux, avec ou sans réserves, au sens de l'article 1792-6 du Code civil. Aucune information du dossier n'est préremplie."
  )

  blankField(state, "Date de la réception")
  blankField(state, "Lieu de la réception")
  blankField(state, "Maître de l'ouvrage (nom et adresse)", 2)
  blankField(state, "Entreprise ou constructeur (nom et adresse)", 2)
  blankField(state, "Adresse du chantier", 2)
  blankField(state, "Nature des travaux", 2)

  paragraph(state, "Le maître de l'ouvrage déclare accepter l'ouvrage :", 11, true)
  paragraph(state, "[ ] sans réserve")
  paragraph(state, "[ ] avec les réserves décrites ci-dessous")
  blankField(state, "Réserves", 4)
  blankField(state, "Date prévue pour la levée des réserves")

  paragraph(
    state,
    "Le procès-verbal est signé par le maître de l'ouvrage et par l'entreprise. Si l'entreprise ne se présente pas, la convocation en lettre recommandée est jointe."
  )
  blankField(state, "Signature du maître de l'ouvrage", 2)
  blankField(state, "Signature de l'entreprise", 2)

  paragraph(
    state,
    "À renvoyer à Optimum Assurance à la fin du chantier, à l'adresse indiquée dans votre espace client."
  )

  return finalizeWithFooters(pdf, font, fontBold)
}
