import { PDFDocument, StandardFonts } from "pdf-lib"
import type { InsuranceContract } from "@/lib/prisma-client"
import {
  COMPANY_BRAND,
  INSURER_NAME,
  LEGAL_ORIAS_LINE,
  QUARTERLY_SCHEDULE_LEGAL_PARAGRAPHS,
} from "@/lib/legal-branding"
import { SITE_URL } from "@/lib/site-url"
import { drawAccelerantLogoOnPage, loadAccelerantLogoImage } from "@/lib/pdf/shared/accelerantLogo"
import { formatEuro } from "@/lib/pdf/shared/pdfUtils"
import { sanitizeForPdfLib } from "@/lib/pdf/shared/sanitizePdfText"
import { PdfValidationError } from "@/lib/pdf/errors"
import { primeTrimestrielle } from "@/lib/mollie-sepa"
import {
  getRcFabPeriodicityMeta,
  normalizeRcFabPeriodicity,
  type RcFabPeriodicity,
} from "@/lib/rc-fabriquant-dossier-config"

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime())
  out.setMonth(out.getMonth() + months)
  return out
}

function parseRcFabPeriodicityFromExclusionsJson(raw: string | null | undefined): RcFabPeriodicity | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    const cfgRaw = (parsed as { rcFabriquantDossierConfig?: unknown }).rcFabriquantDossierConfig
    if (!cfgRaw || typeof cfgRaw !== "object" || Array.isArray(cfgRaw)) return null
    const periodicite = (cfgRaw as { periodicite?: unknown }).periodicite
    if (
      periodicite === "mensuel" ||
      periodicite === "trimestriel" ||
      periodicite === "semestriel" ||
      periodicite === "annuel"
    ) {
      return periodicite
    }
  } catch {
    return null
  }
  return null
}

function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length <= maxChars) cur = next
    else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function drawLines(
  page: { drawText: (t: string, o: Record<string, unknown>) => void },
  lines: string[],
  x: number,
  yStart: number,
  lineHeight: number,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number
): number {
  let y = yStart
  for (const raw of lines) {
    const sublines = wrapLine(raw, 92)
    for (const sub of sublines) {
      page.drawText(sanitizeForPdfLib(sub), { x, y, size, font, maxWidth })
      y -= lineHeight
    }
    y -= 4
  }
  return y
}

function scheduleAmounts(c: InsuranceContract): {
  perQuarter: number
  annualIndicative: number
  modeLabel: string
  assumptionNote: string
  scheduleLabel: string
} {
  if (c.productType === "rc_fabriquant") {
    const periodicityRaw = parseRcFabPeriodicityFromExclusionsJson(c.exclusionsJson)
    const periodicity = normalizeRcFabPeriodicity(periodicityRaw)
    const meta = getRcFabPeriodicityMeta(periodicity)
    const per = Math.round(c.premium * 100) / 100
    const annual = Math.round(per * meta.installmentsPerYear * 100) / 100
    const scheduleLabel =
      periodicity === "mensuel"
        ? "mensuel"
        : periodicity === "semestriel"
          ? "semestriel"
          : periodicity === "annuel"
            ? "annuel"
            : "trimestriel"
    return {
      perQuarter: per,
      annualIndicative: annual,
      modeLabel: "Virement bancaire sécurisé (Mollie) — montant du contrat à chaque échéance",
      assumptionNote:
        `Échéancier ${scheduleLabel} paramétré en gestion : ${meta.installmentsPerYear} échéance(s) par an. La prime annuelle indicative est calculée à partir du montant d'échéance × ${meta.installmentsPerYear} (sauf avenant).`,
      scheduleLabel,
    }
  }
  if (c.productType === "decennale") {
    const annual = Math.round(c.premium * 100) / 100
    const per = primeTrimestrielle(annual)
    return {
      perQuarter: per,
      annualIndicative: annual,
      modeLabel:
        "1er trimestre : carte bancaire (Mollie) + frais de dossier selon parcours ; trimestres suivants : prélèvement SEPA sur mandat",
      assumptionNote:
        "Hypothèse : la prime TTC du contrat correspond à la prime annuelle, répartie en 4 échéances trimestrielles égales (hors frais éventuels du 1er appel).",
      scheduleLabel: "trimestriel",
    }
  }
  throw new PdfValidationError("Échéancier trimestriel non applicable à ce produit.", "SCHEDULE_NOT_APPLICABLE")
}

/**
 * PDF « Échéancier annuel » + mentions légales — fréquence selon le contrat
 * (décennale ou RC Fabriquant).
 */
export async function generateQuarterlyScheduleInsurancePdf(c: InsuranceContract): Promise<Uint8Array> {
  const { perQuarter, annualIndicative, modeLabel, assumptionNote, scheduleLabel } = scheduleAmounts(c)

  const anchor = c.validFrom ?? c.paidAt ?? c.createdAt
  const t1 = anchor
  const t2 = addMonths(anchor, 3)
  const t3 = addMonths(anchor, 6)
  const t4 = addMonths(anchor, 9)

  const produitLib =
    c.productType === "rc_fabriquant" ? "Responsabilité civile fabriquant" : "Assurance décennale (contrat plateforme)"

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let page = pdf.addPage([595.28, 841.89])
  const margin = 50
  const maxW = 495
  const accelLogo = await loadAccelerantLogoImage(pdf)
  let y = 800
  if (accelLogo) {
    const { imgBottom } = drawAccelerantLogoOnPage(page, accelLogo)
    y = imgBottom - 20
  }

  const scheduleTitle =
    scheduleLabel === "mensuel"
      ? "ÉCHÉANCIER ANNUEL DE COTISATION (MENSUEL)"
      : scheduleLabel === "semestriel"
        ? "ÉCHÉANCIER ANNUEL DE COTISATION (SEMESTRIEL)"
        : scheduleLabel === "annuel"
          ? "ÉCHÉANCIER ANNUEL DE COTISATION (ANNUEL)"
          : "ÉCHÉANCIER ANNUEL DE COTISATION (TRIMESTRIEL)"
  page.drawText(sanitizeForPdfLib(scheduleTitle), {
    x: margin,
    y,
    size: 14,
    font: bold,
  })
  y -= 26
  page.drawText(sanitizeForPdfLib(`${COMPANY_BRAND} — ${INSURER_NAME}`), { x: margin, y, size: 10, font })
  y -= 18
  page.drawText(sanitizeForPdfLib(`Contrat n° ${c.contractNumber}`), { x: margin, y, size: 10, font: bold })
  y -= 14
  page.drawText(sanitizeForPdfLib(`Produit : ${produitLib}`), { x: margin, y, size: 10, font })
  y -= 14
  page.drawText(sanitizeForPdfLib(`Souscripteur : ${c.clientName}`), { x: margin, y, size: 10, font })
  y -= 14
  page.drawText(sanitizeForPdfLib(`Adresse : ${c.address}`), { x: margin, y, size: 10, font, maxWidth: maxW })
  y -= 20
  page.drawText(sanitizeForPdfLib(`Période de référence : du ${t1.toLocaleDateString("fr-FR")} au ${addMonths(t1, 12).toLocaleDateString("fr-FR")} (12 mois)`), {
    x: margin,
    y,
    size: 9,
    font,
    maxWidth: maxW,
  })
  y -= 28

  page.drawText(sanitizeForPdfLib("Tableau des échéances"), { x: margin, y, size: 11, font: bold })
  y -= 18

  const rows: [string, string, string][] =
    scheduleLabel === "mensuel"
      ? Array.from({ length: 12 }).map((_, idx) => {
          const d = addMonths(t1, idx)
          return [`M${idx + 1}`, d.toLocaleDateString("fr-FR"), formatEuro(perQuarter)] as [string, string, string]
        })
      : scheduleLabel === "semestriel"
        ? [
            ["S1", t1.toLocaleDateString("fr-FR"), formatEuro(perQuarter)],
            ["S2", addMonths(t1, 6).toLocaleDateString("fr-FR"), formatEuro(perQuarter)],
          ]
        : scheduleLabel === "annuel"
          ? [["A1", t1.toLocaleDateString("fr-FR"), formatEuro(perQuarter)]]
          : [
              ["1er trimestre (T1)", t1.toLocaleDateString("fr-FR"), formatEuro(perQuarter)],
              ["2e trimestre (T2)", t2.toLocaleDateString("fr-FR"), formatEuro(perQuarter)],
              ["3e trimestre (T3)", t3.toLocaleDateString("fr-FR"), formatEuro(perQuarter)],
              ["4e trimestre (T4)", t4.toLocaleDateString("fr-FR"), formatEuro(perQuarter)],
            ]

  page.drawText(sanitizeForPdfLib("Échéance"), { x: margin, y, size: 9, font: bold })
  page.drawText(sanitizeForPdfLib("Date indicative"), { x: margin + 200, y, size: 9, font: bold })
  page.drawText(sanitizeForPdfLib("Montant TTC / terme"), { x: margin + 360, y, size: 9, font: bold })
  y -= 14
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: margin + maxW, y: y + 4 }, thickness: 0.5 })
  y -= 8

  for (const [label, date, amt] of rows) {
    page.drawText(sanitizeForPdfLib(label), { x: margin, y, size: 9, font })
    page.drawText(sanitizeForPdfLib(date), { x: margin + 200, y, size: 9, font })
    page.drawText(sanitizeForPdfLib(amt), { x: margin + 360, y, size: 9, font: bold })
    y -= 16
  }

  y -= 10
  const totalIndicatif = rows.length * perQuarter
  page.drawText(sanitizeForPdfLib(`Total indicatif sur 12 mois (${rows.length} × échéance) : ${formatEuro(totalIndicatif)}`), {
    x: margin,
    y,
    size: 9,
    font: bold,
  })
  y -= 14
  page.drawText(sanitizeForPdfLib(`Prime annuelle de référence (indicatif) : ${formatEuro(annualIndicative)}`), {
    x: margin,
    y,
    size: 8,
    font,
    maxWidth: maxW,
  })
  y -= 28

  page.drawText(sanitizeForPdfLib("Modalités de règlement"), { x: margin, y, size: 10, font: bold })
  y -= 14
  y = drawLines(page, [modeLabel, assumptionNote], margin, y, 11, font, 8, maxW)

  y -= 8
  page.drawText(sanitizeForPdfLib("MENTIONS LÉGALES"), { x: margin, y, size: 11, font: bold })
  y -= 16

  for (const para of QUARTERLY_SCHEDULE_LEGAL_PARAGRAPHS) {
    if (y < 100) {
      page = pdf.addPage([595.28, 841.89])
      y = 800
    }
    y = drawLines(page, [para], margin, y, 10, font, 8, maxW)
  }

  if (y < 72) {
    page = pdf.addPage([595.28, 841.89])
    y = 800
  }
  y = Math.min(y, 120)
  page.drawText(sanitizeForPdfLib(LEGAL_ORIAS_LINE), { x: margin, y: 62, size: 8, font: bold, maxWidth: maxW })
  page.drawText(sanitizeForPdfLib(`CGV / informations : ${SITE_URL}/cgv`), { x: margin, y: 46, size: 8, font, maxWidth: maxW })

  return pdf.save()
}
