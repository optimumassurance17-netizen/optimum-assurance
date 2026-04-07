import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceData } from "../types"
import { validateDoQuote } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"
import { PROTECTION_JURIDIQUE_GARANTIE_EUR } from "@/lib/legal-protection"

export async function generateDOPolicy(data: InsuranceData): Promise<Uint8Array> {
  validateDoQuote(data)

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "CONDITIONS PARTICULIÈRES — Dommages-ouvrage",
    "Contrat DO",
    accelerantLogo
  )

  drawTextPdf(page, `Contrat N° ${data.contractNumber}`, {
    x: PDF_PAGE.marginX,
    y,
    size: 11,
    font: fontBold,
    color: PDF_COLORS.text,
  })
  y -= 14
  drawTextPdf(page, `Document généré le ${formatGeneratedAt(data.createdAt)}`, {
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
    `Souscripteur : ${data.clientName}.`,
    `Adresse : ${data.address}.`,
    `Chantier / opération : ${data.projectName} — ${data.projectAddress}.`,
    data.constructionNature ? `Nature de la construction : ${data.constructionNature}.` : "",
    `Période couverte : du ${data.startDate} au ${data.endDate}.`,
    `Prime TTC : ${formatEuro(data.premium)}.`,
    "Franchise : aucune (garantie obligatoire dommages-ouvrage).",
    `Protection juridique : garantie défense/recours à hauteur de ${formatEuro(PROTECTION_JURIDIQUE_GARANTIE_EUR)} par litige couvert.`,
    "Paiement : selon modalités contractuelles (virement ou prélèvement selon proposition).",
    "Objet : préfinancement rapide des travaux de réparation relevant de la garantie décennale, sans attendre une décision au fond sur les responsabilités.",
    "Déclenchement : après réception d’une déclaration de sinistre complète et instruite selon les délais légaux applicables en dommages-ouvrage.",
    "Périmètre : dommages compromettant la solidité de l’ouvrage ou l’affectant dans son usage normal, sous réserve des conditions, exclusions et limites prévues au contrat.",
    "Exclusions usuelles : défaut d’entretien, usure normale, dommages esthétiques isolés, non-conformités sans atteinte décennale, et cas listés aux conditions générales.",
    "Obligations du souscripteur : exactitude des déclarations techniques (destination, nature des travaux, intervenants), conservation des pièces du chantier, information en cas de modification substantielle du projet.",
    "Sinistre : notification écrite avec description circonstanciée, date d’apparition, photos/constats et pièces techniques utiles pour instruction.",
    "Résiliation / nullité : selon les dispositions contractuelles, notamment en cas de non-paiement ou de fausse déclaration intentionnelle.",
    "Le souscripteur atteste l’exactitude des informations techniques. La garantie est subordonnée à l’étude du dossier et à l’acceptation du risque par l’assureur.",
    `Références : ${SITE_URL}/conditions-generales-dommage-ouvrage — ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
  ].filter(Boolean) as string[]

  for (const c of clauses) {
    y = drawWrappedText(page, c, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 9, 12)
    y -= 8
  }

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
