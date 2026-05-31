import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import { DEVOIR_CONSEIL_TEXT_BY_PRODUCT, getDevoirConseilLinksLine } from "@/lib/devoir-conseil"
import { ANTI_FRAUD_LINE, PDF_COLORS, PDF_PAGE } from "@/lib/pdf/shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro } from "@/lib/pdf/shared/pdfUtils"
import { drawOptimumHeader } from "@/lib/pdf/shared/drawHeader"
import { embedStandardFonts } from "@/lib/pdf/shared/initPdf"
import { finalizeWithFooters } from "@/lib/pdf/shared/finalizePdf"
import { loadAccelerantLogoImage } from "@/lib/pdf/shared/accelerantLogo"
import type { AssuranceTitreContractConfig } from "@/lib/assurance-titre-contract-config"

export type AssuranceTitreDocumentData = {
  clientName: string
  siret?: string
  address: string
  validFrom: string
  validUntil: string
  referenceContrat: string
  config: AssuranceTitreContractConfig
}

type DrawState = {
  page: import("pdf-lib").PDFPage
  y: number
}

function assureSpace(
  state: DrawState,
  minY: number,
  makePage: () => DrawState
): DrawState {
  if (state.y <= minY) return makePage()
  return state
}

function drawSectionTitle(
  state: DrawState,
  title: string,
  fontBold: import("pdf-lib").PDFFont
): DrawState {
  drawTextPdf(state.page, title, {
    x: PDF_PAGE.marginX,
    y: state.y,
    size: 10.5,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  return { ...state, y: state.y - 16 }
}

function drawParagraph(
  state: DrawState,
  text: string,
  font: import("pdf-lib").PDFFont,
  size = 9,
  lineHeight = 12
): DrawState {
  const y = drawWrappedText(
    state.page,
    text,
    PDF_PAGE.marginX,
    state.y,
    PDF_PAGE.contentWidth,
    font,
    size,
    lineHeight
  )
  return { ...state, y: y - 7 }
}

function drawBullets(
  state: DrawState,
  items: readonly string[],
  font: import("pdf-lib").PDFFont
): DrawState {
  let next = state
  for (const item of items) {
    if (!item.trim()) continue
    next = drawParagraph(next, `• ${item}`, font, 9, 12)
  }
  return next
}

function buildCoveragePeriodLabel(config: AssuranceTitreContractConfig): string {
  return config.coverageDurationYears <= 1
    ? "Validité initiale : 1 an à compter de la prise d'effet."
    : `Validité initiale : ${config.coverageDurationYears} ans à compter de la prise d'effet.`
}

function buildRiskSummary(config: AssuranceTitreContractConfig): string[] {
  const items: string[] = []
  if (config.dossier.operationLabel) {
    items.push(`Opération : ${config.dossier.operationLabel}.`)
  }
  if (config.dossier.propertyTypeLabel) {
    items.push(`Type de bien : ${config.dossier.propertyTypeLabel}.`)
  }
  if (config.dossier.needLabel) {
    items.push(`Besoin principal : ${config.dossier.needLabel}.`)
  }
  if (config.dossier.capitalAmount) {
    items.push(`Montant déclaré de l'opération : ${formatEuro(config.dossier.capitalAmount)}.`)
  }
  if (config.dossier.riskLabels.length > 0) {
    items.push(`Points analysés : ${config.dossier.riskLabels.join(", ")}.`)
  }
  if (config.dossier.details) {
    items.push(`Précisions dossier : ${config.dossier.details}.`)
  }
  return items
}

function buildIdentityLines(data: AssuranceTitreDocumentData): string[] {
  const lines = [`Souscripteur : ${data.clientName}.`, `Adresse de facturation : ${data.address}.`]
  if (data.siret?.trim()) {
    lines.push(`SIRET : ${data.siret.trim()}.`)
  }
  if (data.config.dossier.contactName && data.config.dossier.contactName !== data.clientName) {
    lines.push(`Contact dossier : ${data.config.dossier.contactName}.`)
  }
  if (data.config.dossier.structureName && data.config.dossier.structureName !== data.clientName) {
    lines.push(`Structure : ${data.config.dossier.structureName}.`)
  }
  return lines
}

function buildPropertyLines(config: AssuranceTitreContractConfig): string[] {
  const lines: string[] = []
  const propertyLine = [
    config.dossier.propertyAddress,
    [config.dossier.propertyPostalCode, config.dossier.propertyCity].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ")
  if (propertyLine) {
    lines.push(`Bien / actif : ${propertyLine}.`)
  }
  if (config.dossier.parties.length > 0) {
    lines.push(`Parties / conseils : ${config.dossier.parties.join(" · ")}.`)
  }
  if (config.dossier.availableDocuments.length > 0) {
    lines.push(`Pièces déclarées : ${config.dossier.availableDocuments.join(", ")}.`)
  }
  return lines
}

function buildGuaranteeLines(config: AssuranceTitreContractConfig): string[] {
  return [
    "Garantie étudiée sur la base des déclarations du souscripteur et des pièces transmises.",
    "Couverture selon les conditions particulières, limites et exclusions prévues au dossier signé.",
    "Activation après validation assureur et encaissement du règlement correspondant.",
    buildCoveragePeriodLabel(config),
  ]
}

export async function generateAssuranceTitrePolicyPdf(
  data: AssuranceTitreDocumentData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  const makePage = () => {
    const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
    return {
      page,
      y: drawOptimumHeader(
        page,
        font,
        fontBold,
        "CONDITIONS PARTICULIERES — Assurance titre",
        "Parcours digital — proposition signee et contractualisee",
        accelerantLogo
      ),
    }
  }

  let state = makePage()
  state = drawParagraph(state, `Référence contrat : ${data.referenceContrat}`, fontBold, 10, 13)
  state = drawParagraph(
    state,
    `Période déclarée : du ${data.validFrom} au ${data.validUntil}.`,
    font,
    9,
    12
  )

  state = assureSpace(state, 190, makePage)
  state = drawSectionTitle(state, "Identité du dossier", fontBold)
  state = drawBullets(state, buildIdentityLines(data), font)

  state = assureSpace(state, 190, makePage)
  state = drawSectionTitle(state, "Actif immobilier et contexte", fontBold)
  state = drawBullets(state, buildPropertyLines(data.config), font)
  state = drawBullets(state, buildRiskSummary(data.config), font)

  state = assureSpace(state, 190, makePage)
  state = drawSectionTitle(state, "Garantie et conditions", fontBold)
  state = drawBullets(state, buildGuaranteeLines(data.config), font)

  state = assureSpace(state, 170, makePage)
  state = drawSectionTitle(state, "Prime et règlement", fontBold)
  state = drawBullets(
    state,
    [
      `Prime HT : ${formatEuro(data.config.primeAnnuelleHt)}.`,
      `Prime TTC : ${formatEuro(data.config.primeAnnuelleTtc)}.`,
      "Règlement prévu en une seule échéance via virement bancaire sécurisé (Mollie).",
    ],
    font
  )

  state = assureSpace(state, 150, makePage)
  state = drawParagraph(
    state,
    `Devoir de conseil : ${DEVOIR_CONSEIL_TEXT_BY_PRODUCT.assurance_titre.contenu}`,
    font,
    8.8,
    11
  )
  state = drawParagraph(state, getDevoirConseilLinksLine("assurance_titre"), font, 8, 10)
  state = drawParagraph(
    state,
    `Ressources utiles : ${SITE_URL}/espace-client — ${SITE_URL}/assurance-titre`,
    font,
    8,
    10
  )
  drawParagraph(state, ANTI_FRAUD_LINE, font, 8, 10)

  return finalizeWithFooters(pdfDoc, font, fontBold)
}

export async function generateAssuranceTitreCertificatePdf(
  data: AssuranceTitreDocumentData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])

  let state: DrawState = {
    page,
    y: drawOptimumHeader(
      page,
      font,
      fontBold,
      "ATTESTATION DE GARANTIE — Assurance titre",
      "Document emis apres signature et enregistrement du paiement",
      accelerantLogo
    ),
  }

  state = drawParagraph(state, `Contrat : ${data.referenceContrat}`, fontBold, 10, 13)
  state = drawParagraph(state, `Souscripteur : ${data.clientName}`, font, 9, 12)
  state = drawParagraph(
    state,
    `Validité : du ${data.validFrom} au ${data.validUntil}.`,
    font,
    9,
    12
  )

  state = drawSectionTitle(state, "Dossier couvert", fontBold)
  state = drawBullets(
    state,
    [
      buildPropertyLines(data.config)[0] ?? "",
      data.config.dossier.operationLabel
        ? `Opération assurée : ${data.config.dossier.operationLabel}.`
        : "",
      data.config.dossier.propertyTypeLabel
        ? `Type d'actif : ${data.config.dossier.propertyTypeLabel}.`
        : "",
      data.config.dossier.capitalAmount
        ? `Montant de référence : ${formatEuro(data.config.dossier.capitalAmount)}.`
        : "",
    ],
    font
  )

  state = drawSectionTitle(state, "Synthèse de garantie", fontBold)
  state = drawBullets(
    state,
    [
      "Garantie activée sous réserve du strict respect des conditions particulières signées.",
      "Les limitations, exclusions, plafonds et franchises figurent dans le dossier contractuel remis au client.",
      buildCoveragePeriodLabel(data.config),
      `Prime acquittée : ${formatEuro(data.config.primeAnnuelleTtc)} TTC.`,
    ],
    font
  )

  if (data.config.dossier.riskLabels.length > 0) {
    state = drawSectionTitle(state, "Points suivis au dossier", fontBold)
    state = drawBullets(
      state,
      data.config.dossier.riskLabels.map((risk) => `${risk}.`),
      font
    )
  }

  state = drawParagraph(
    state,
    `Devoir de conseil : ${DEVOIR_CONSEIL_TEXT_BY_PRODUCT.assurance_titre.contenu}`,
    font,
    8.8,
    11
  )
  state = drawParagraph(state, getDevoirConseilLinksLine("assurance_titre"), font, 8, 10)
  drawParagraph(state, ANTI_FRAUD_LINE, font, 8, 10)

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
