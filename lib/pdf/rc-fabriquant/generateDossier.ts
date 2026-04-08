import { PDFDocument } from "pdf-lib"
import { SITE_URL } from "@/lib/site-url"
import { DEVOIR_CONSEIL_TEXT_BY_PRODUCT, getDevoirConseilLinksLine } from "@/lib/devoir-conseil"
import { ANTI_FRAUD_LINE, PDF_COLORS, PDF_PAGE } from "@/lib/pdf/shared/pdfLayout"
import { drawTextPdf, drawWrappedText, formatEuro } from "@/lib/pdf/shared/pdfUtils"
import { drawOptimumHeader } from "@/lib/pdf/shared/drawHeader"
import { embedStandardFonts } from "@/lib/pdf/shared/initPdf"
import { finalizeWithFooters } from "@/lib/pdf/shared/finalizePdf"
import { loadAccelerantLogoImage } from "@/lib/pdf/shared/accelerantLogo"
import type { RcFabDossierConfig } from "@/lib/rc-fabriquant-dossier-config"

export type RcFabBatteriesDocumentData = {
  nomSociete: string
  siret?: string
  adresse: string
  activite: string
  dateEffet: string
  dateEcheance: string
  referenceContrat: string
  config: RcFabDossierConfig
}

const QUOTE_VALIDITY_DAYS = 30

type DrawState = {
  page: import("pdf-lib").PDFPage
  y: number
}

function periodicityLine(config: RcFabDossierConfig): string {
  return `${config.periodicite} (${config.installmentsPerYear} échéance(s) / an), soit ${formatEuro(config.montantParEcheanceTtc)} par échéance.`
}

function assureSpace(state: DrawState, minY: number, makePage: () => DrawState): DrawState {
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
    next = drawParagraph(next, `• ${item}`, font, 9, 12)
  }
  return next
}

function drawIdentityBlock(
  state: DrawState,
  data: RcFabBatteriesDocumentData,
  font: import("pdf-lib").PDFFont,
  fontBold: import("pdf-lib").PDFFont
): DrawState {
  let next = drawSectionTitle(state, "Informations de l’assuré", fontBold)
  next = drawParagraph(next, `Société : ${data.nomSociete}`, font)
  if (data.siret?.trim()) {
    next = drawParagraph(next, `SIRET : ${data.siret.trim()}`, font)
  }
  next = drawParagraph(next, `Adresse : ${data.adresse}`, font)
  next = drawParagraph(next, `Activité assurée : ${data.activite}`, font)
  return next
}

function drawGuaranteesBlock(
  state: DrawState,
  data: RcFabBatteriesDocumentData,
  font: import("pdf-lib").PDFFont,
  fontBold: import("pdf-lib").PDFFont
): DrawState {
  let next = drawSectionTitle(state, "Garanties et montants", fontBold)
  next = drawBullets(
    next,
    [
      "Responsabilité civile exploitation.",
      "Responsabilité civile produits / après livraison.",
      "Dommages corporels, matériels et immatériels consécutifs.",
      `Protection juridique : ${formatEuro(data.config.protectionJuridique)}.`,
      `Plafond global : ${formatEuro(data.config.plafondGlobalParSinistreEtParAn)} par sinistre et par an.`,
      `Franchise fixe : ${formatEuro(data.config.franchiseParSinistre)} par sinistre.`,
    ],
    font
  )
  return next
}

export async function generateRcFabBatteriesQuotePdf(
  data: RcFabBatteriesDocumentData
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
      "DEVIS — Responsabilité Civile Fabricant Batteries",
      "Mode étude — proposition commerciale",
      accelerantLogo
    ),
  }

  state = drawParagraph(state, `Référence contrat : ${data.referenceContrat}`, fontBold, 10, 13)
  state = drawParagraph(state, `Période de couverture : du ${data.dateEffet} au ${data.dateEcheance}.`, font, 9, 12)
  state = drawIdentityBlock(state, data, font, fontBold)
  state = drawGuaranteesBlock(state, data, font, fontBold)

  state = drawSectionTitle(state, "Prime et échéancier", fontBold)
  state = drawBullets(
    state,
    [
      `Prime annuelle HT : ${formatEuro(data.config.primeAnnuelleHt)}.`,
      `Prime annuelle TTC : ${formatEuro(data.config.primeAnnuelleTtc)}.`,
      `Échéancier retenu : ${periodicityLine(data.config)}`,
    ],
    font
  )

  state = drawParagraph(
    state,
    `Validité de la présente proposition : ${QUOTE_VALIDITY_DAYS} jours calendaires à compter de sa date d’émission.`,
    font,
    9,
    12
  )
  state = drawParagraph(
    state,
    "BON POUR ACCORD : signature électronique du souscripteur, précédée de la mention « Lu et approuvé ».",
    fontBold,
    10,
    13
  )
  state = drawParagraph(state, `Mentions utiles : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`, font, 8, 11)
  drawParagraph(state, ANTI_FRAUD_LINE, font, 8, 11)

  return finalizeWithFooters(pdfDoc, font, fontBold)
}

export async function generateRcFabBatteriesFicPdf(
  data: RcFabBatteriesDocumentData
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
      "FICHE D’INFORMATION CONTRACTUELLE (FIC)",
      "Responsabilité Civile Fabricant Batteries",
      accelerantLogo
    ),
  }

  state = drawSectionTitle(state, "Identité assureur / intermédiaire", fontBold)
  state = drawBullets(
    state,
    [
      "Assureur : Accelerant Insurance.",
      "Intermédiaire distributeur : Optimum Courtage.",
      `Référence dossier : ${data.referenceContrat}.`,
    ],
    font
  )
  state = drawIdentityBlock(state, data, font, fontBold)
  state = drawGuaranteesBlock(state, data, font, fontBold)

  state = drawSectionTitle(state, "Territorialité, droit applicable et points clés", fontBold)
  state = drawBullets(
    state,
    [
      "Territorialité : monde entier, hors États-Unis et Canada.",
      "Droit applicable : droit français.",
      "Prime : payable selon l’échéancier contractuel retenu.",
      `Échéancier retenu : ${periodicityLine(data.config)}`,
    ],
    font
  )

  state = drawSectionTitle(state, "Exclusions principales", fontBold)
  state = drawBullets(
    state,
    [
      "Faute intentionnelle, dol ou fraude de l’assuré.",
      "Défaut connu avant la date d’effet et non déclaré.",
      "Campagnes de rappel de produits.",
      "Pertes financières non consécutives.",
      "Pollution non accidentelle, cyber-risques, guerre et terrorisme.",
    ],
    font
  )

  state = drawParagraph(state, `Devoir de conseil : ${DEVOIR_CONSEIL_TEXT_BY_PRODUCT.rc_fabriquant.contenu}`, font, 8.8, 11)
  drawParagraph(state, getDevoirConseilLinksLine("rc_fabriquant"), font, 8, 10)

  return finalizeWithFooters(pdfDoc, font, fontBold)
}

export async function generateRcFabBatteriesPolicyPdf(
  data: RcFabBatteriesDocumentData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const { font, fontBold } = await embedStandardFonts(pdfDoc)
  const accelerantLogo = await loadAccelerantLogoImage(pdfDoc)

  const makePage = (title: string, subtitle: string): DrawState => {
    const page = pdfDoc.addPage([PDF_PAGE.width, PDF_PAGE.height])
    return {
      page,
      y: drawOptimumHeader(page, font, fontBold, title, subtitle, accelerantLogo),
    }
  }

  let state = makePage(
    "CONTRAT — Responsabilité Civile Fabricant Batteries",
    "Conditions générales et particulières"
  )

  const sections: Array<{ title: string; paragraphs: string[] }> = [
    {
      title: "Définitions",
      paragraphs: [
        "Assuré : la société désignée aux conditions particulières.",
        "Sinistre : tout fait dommageable susceptible d’engager la responsabilité de l’assuré.",
        "Dommage corporel : atteinte à l’intégrité physique d’une personne.",
        "Dommage matériel : détérioration, destruction ou perte d’une chose.",
        "Dommage immatériel consécutif : préjudice pécuniaire résultant d’un dommage corporel ou matériel garanti.",
      ],
    },
    {
      title: "Objet du contrat",
      paragraphs: [
        "Le présent contrat a pour objet de garantir les conséquences pécuniaires de la responsabilité civile pouvant incomber à l’assuré du fait de son activité de fabrication de batteries.",
        `Référence : ${data.referenceContrat} — période de validité du ${data.dateEffet} au ${data.dateEcheance}.`,
      ],
    },
    {
      title: "Étendue des garanties",
      paragraphs: [
        "Responsabilité civile exploitation.",
        "Responsabilité civile produits / après livraison.",
        "Dommages corporels, matériels et immatériels consécutifs.",
        `Défense, recours et protection juridique à hauteur de ${formatEuro(data.config.protectionJuridique)}.`,
      ],
    },
    {
      title: "Garanties détaillées",
      paragraphs: [
        "RC exploitation : dommages causés aux tiers dans le cadre de l’exploitation déclarée.",
        "RC produits : dommages causés après livraison des produits fabriqués.",
        "Dommages immatériels consécutifs : couverts lorsqu’ils résultent d’un dommage corporel ou matériel garanti.",
        "Défense recours : frais de défense civile et exercice des recours utiles.",
        `Protection juridique : ${formatEuro(data.config.protectionJuridique)}.`,
      ],
    },
    {
      title: "Plafonds et franchise",
      paragraphs: [
        `Plafond global : ${formatEuro(data.config.plafondGlobalParSinistreEtParAn)} par sinistre et par an.`,
        `Franchise contractuelle : ${formatEuro(data.config.franchiseParSinistre)} par sinistre, tous dommages confondus.`,
      ],
    },
    {
      title: "Exclusions",
      paragraphs: [
        "Sont exclus : faute intentionnelle, dol, fraude, ou tout acte volontaire de l’assuré.",
        "Sont exclus : sinistres résultant d’un défaut connu avant la prise d’effet et non déclaré.",
        "Sont exclus : frais et conséquences d’une campagne de rappel de produits.",
        "Sont exclus : dommages liés à une modification du produit après livraison par l’assuré ou un tiers non autorisé.",
        "Sont exclus : dommages causés par mauvaise utilisation manifeste, usage non conforme ou stockage inadapté.",
        "Sont exclus : obligations contractuelles excédant la responsabilité légale de droit commun.",
        "Sont exclus : pertes financières non consécutives à un dommage corporel ou matériel garanti.",
        "Sont exclus : pollution non accidentelle, progressive ou répétée.",
        "Sont exclus : cyber-risques, atteintes aux données, indisponibilité de systèmes d’information.",
        "Sont exclus : guerre, émeute assimilée, acte de terrorisme, réquisition ou fait d’autorité publique.",
      ],
    },
    {
      title: "Sinistres",
      paragraphs: [
        "Tout sinistre doit être déclaré dès connaissance, avec faits, date, circonstances et justificatifs utiles.",
        "L’assuré s’interdit toute reconnaissance de responsabilité ou transaction sans accord préalable de l’assureur.",
      ],
    },
    {
      title: "Obligations de l’assuré",
      paragraphs: [
        "Déclaration exacte et complète du risque à la souscription et en cours de contrat.",
        "Prévention raisonnable et conservation des preuves après sinistre.",
        "Communication sans délai de tout élément pouvant aggraver le risque.",
      ],
    },
    {
      title: "Résiliation",
      paragraphs: [
        "Le contrat peut être résilié dans les cas et délais prévus par les dispositions légales et contractuelles applicables.",
        "La résiliation n’affecte pas le traitement des sinistres survenus pendant la période de validité, selon les clauses du contrat.",
      ],
    },
    {
      title: "Prime et échéancier",
      paragraphs: [
        `Prime annuelle HT : ${formatEuro(data.config.primeAnnuelleHt)}.`,
        `Prime annuelle TTC : ${formatEuro(data.config.primeAnnuelleTtc)}.`,
        `Échéancier : ${periodicityLine(data.config)}`,
      ],
    },
  ]

  for (const section of sections) {
    state = assureSpace(state, PDF_PAGE.marginBottom + 80, () =>
      makePage("CONTRAT — RC Fabricant Batteries", "Suite des conditions générales")
    )
    state = drawSectionTitle(state, section.title, fontBold)
    for (const p of section.paragraphs) {
      state = assureSpace(state, PDF_PAGE.marginBottom + 50, () =>
        makePage("CONTRAT — RC Fabricant Batteries", "Suite des conditions générales")
      )
      state = drawParagraph(state, p, font, 9, 12)
    }
  }

  state = assureSpace(state, PDF_PAGE.marginBottom + 70, () =>
    makePage("CONTRAT — RC Fabricant Batteries", "Mentions finales")
  )
  state = drawParagraph(state, `Devoir de conseil : ${DEVOIR_CONSEIL_TEXT_BY_PRODUCT.rc_fabriquant.contenu}`, font, 8.8, 11)
  state = drawParagraph(state, getDevoirConseilLinksLine("rc_fabriquant"), font, 8, 10)
  state = drawParagraph(state, `Références : ${SITE_URL}/cgv — ${SITE_URL}/conditions-attestations`, font, 8, 10)
  state = drawParagraph(state, ANTI_FRAUD_LINE, font, 8, 10)

  return finalizeWithFooters(pdfDoc, font, fontBold)
}

export async function generateRcFabBatteriesCertificatePdf(
  data: RcFabBatteriesDocumentData
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
      "ATTESTATION D’ASSURANCE",
      "Responsabilité Civile Fabricant Batteries",
      accelerantLogo
    ),
  }

  state = drawParagraph(state, `La présente attestation est délivrée pour la société : ${data.nomSociete}.`, font, 9.2, 12)
  if (data.siret?.trim()) {
    state = drawParagraph(state, `SIRET : ${data.siret.trim()}`, font, 9, 12)
  }
  state = drawParagraph(state, `Adresse : ${data.adresse}`, font, 9, 12)
  state = drawParagraph(state, `Activité : ${data.activite}`, font, 9, 12)
  state = drawParagraph(state, `Référence contrat : ${data.referenceContrat}`, fontBold, 10, 13)
  state = drawParagraph(state, `Validité : du ${data.dateEffet} au ${data.dateEcheance}.`, font, 9, 12)

  state = drawGuaranteesBlock(state, data, font, fontBold)

  state = drawParagraph(
    state,
    "La présente attestation est émise sous réserve de validité du contrat, de paiement des primes exigibles et dans les limites, exclusions et conditions prévues aux dispositions contractuelles.",
    font,
    8.8,
    11
  )
  state = drawParagraph(state, `Vérification publique : ${SITE_URL}/verify/${encodeURIComponent(data.referenceContrat)}`, font, 8.4, 10)
  state = drawParagraph(state, `Mentions utiles : ${SITE_URL}/conditions-attestations`, font, 8, 10)
  drawParagraph(state, ANTI_FRAUD_LINE, font, 8, 10)

  return finalizeWithFooters(pdfDoc, font, fontBold)
}
