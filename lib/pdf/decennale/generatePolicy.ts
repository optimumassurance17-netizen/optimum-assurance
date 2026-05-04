import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import type { InsuranceData } from "../types"
import { validateDecennaleQuote } from "../shared/pdfUtils"
import { embedStandardFonts } from "../shared/initPdf"
import { loadAccelerantLogoImage } from "../shared/accelerantLogo"
import { finalizeWithFooters } from "../shared/finalizePdf"
import { drawOptimumHeader } from "../shared/drawHeader"
import { PDF_COLORS, PDF_PAGE } from "../shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro, formatGeneratedAt } from "../shared/pdfUtils"
import { getDevoirConseilText, getDevoirConseilLinksLine } from "@/lib/devoir-conseil"
import { DECENNALE_LEGAL_CLAUSES } from "@/lib/decennale-legal-clauses"
import { extractOptimizedExclusionLines } from "@/lib/optimized-exclusions"
import { appendDecennaleActivityDetailsAnnex } from "./activityDetailsAnnex"

/**
 * Conditions particulières — contrat décennale (pdf-lib).
 */
export async function generateDecennalePolicy(data: InsuranceData): Promise<Uint8Array> {
  validateDecennaleQuote(data)
  const devoirConseil = getDevoirConseilText("decennale")
  const activities =
    data.activitiesHierarchy && data.activitiesHierarchy.length > 0
      ? data.activitiesHierarchy
      : (data.activities ?? [])
  const optimizedExclusions = extractOptimizedExclusionLines({
    activityExclusions: data.activityExclusions,
  })

  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  let y = drawOptimumHeader(
    page,
    font,
    fontBold,
    "CONDITIONS PARTICULIÈRES — Assurance décennale",
    "Contrat RC décennale",
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
    `Assuré : ${data.clientName}${data.siret ? ` — SIRET ${data.siret}` : ""}.`,
    `Adresse : ${data.address}.`,
    `Période : du ${data.startDate} au ${data.endDate}.`,
    `Activités garanties : ${activities.join("\n")}.`,
    data.activityExclusions?.length
      ? `Activités / travaux exclus : ${data.activityExclusions.join(", ")}.`
      : "Activités / travaux exclus : aucun libellé d’exclusion spécifique déclaré à l’émission.",
    `Prime annuelle TTC : ${formatEuro(data.premium)}.`,
    "Paiement : prélèvement SEPA selon mandat et échéances contractuelles.",
    "Périmètre de garantie : responsabilité civile décennale de l’assuré pour les dommages matériels compromettant la solidité de l’ouvrage ou le rendant impropre à sa destination, dans la limite des conditions générales et particulières.",
    "Protection juridique : défense/recours et assistance juridique selon les conditions générales.",
    "Franchise et plafonds : applicables selon les conditions particulières signées et les conditions générales en vigueur à la date du sinistre.",
    "Obligations déclaratives : toute modification substantielle de l’activité, du chiffre d’affaires, du mode d’exécution des travaux ou de la situation juridique doit être déclarée sans délai.",
    "Sinistre : déclaration écrite dès connaissance du fait dommageable, avec pièces justificatives (référence chantier, nature des dommages, date d’apparition, éléments techniques disponibles).",
    "Résiliation : conformément aux conditions contractuelles, notamment en cas de non-paiement, de fausse déclaration ou à l’échéance selon préavis prévu.",
    `Devoir de conseil : ${devoirConseil}`,
    "Le souscripteur atteste l’exactitude de ses déclarations. Signature et paiement valent engagement sous réserve d’acceptation du risque par l’assureur.",
    getDevoirConseilLinksLine(),
    `Conditions générales et attestations : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`,
  ]

  const exclusionsUpper = DECENNALE_LEGAL_CLAUSES.EXCLUSIONS_RC_DECENNALE.toUpperCase()
  const decheanceUpper = DECENNALE_LEGAL_CLAUSES.DECHEANCE_GARANTIE.toUpperCase()
  clauses.push(exclusionsUpper, decheanceUpper)
  if (optimizedExclusions.length > 0) {
    clauses.push(`Ne sont pas couverts : ${optimizedExclusions.join(" ; ")}`)
  }

  for (const c of clauses) {
    y = drawWrappedText(page, c, PDF_PAGE.marginX, y, PDF_PAGE.contentWidth, font, 9, 12)
    y -= 8
  }

  appendDecennaleActivityDetailsAnnex({
    pdfDoc,
    font,
    fontBold,
    accelerantLogo,
    activities,
    documentLabel: "contrat",
  })

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
