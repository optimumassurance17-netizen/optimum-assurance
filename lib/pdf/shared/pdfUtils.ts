import type { PDFFont, PDFPage } from "pdf-lib"
import { PDF_COLORS, PDF_PAGE } from "./pdfLayout"
import { PdfValidationError } from "../errors"
import type { InsuranceCertificateData, InsuranceData, ProductType } from "../types"
import { sanitizeForPdfLib } from "./sanitizePdfText"

/** Montants lisibles en français sans espaces « exotiques » (évite les erreurs d’encodage pdf-lib). */
export function formatEuro(n: number): string {
  const [intPart, dec] = n.toFixed(2).split(".")
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${grouped},${dec} EUR`
}

export function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso)
    const s = d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
    return sanitizeForPdfLib(s)
  } catch {
    return sanitizeForPdfLib(iso)
  }
}

export function drawTextPdf(
  page: PDFPage,
  text: string,
  options: Parameters<PDFPage["drawText"]>[1]
): void {
  page.drawText(sanitizeForPdfLib(text), options)
}

export function wrapLines(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

export function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
  lineHeight: number,
  color = PDF_COLORS.text
): number {
  const safe = sanitizeForPdfLib(text)
  let y = startY
  for (const line of wrapLines(safe, maxWidth, font, fontSize)) {
    drawTextPdf(page, line, { x, y, size: fontSize, font, color, maxWidth })
    y -= lineHeight
  }
  return y
}

export function assertRequiredString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new PdfValidationError(`Champ requis manquant ou vide : ${field}`, "MISSING_FIELD")
  }
}

export function validateBaseInsuranceData(data: InsuranceData, product: ProductType): void {
  if (data.productType !== product) {
    throw new PdfValidationError(`productType attendu : ${product}`, "INVALID_DATA")
  }
  assertRequiredString(data.clientName, "clientName")
  assertRequiredString(data.address, "address")
  assertRequiredString(data.startDate, "startDate")
  assertRequiredString(data.endDate, "endDate")
  assertRequiredString(data.contractNumber, "contractNumber")
  assertRequiredString(data.createdAt, "createdAt")
  if (typeof data.premium !== "number" || !Number.isFinite(data.premium) || data.premium < 0) {
    throw new PdfValidationError("premium invalide", "INVALID_DATA")
  }
}

export function validateDecennaleQuote(data: InsuranceData): void {
  validateBaseInsuranceData(data, "decennale")
  if (!data.activities?.length) {
    throw new PdfValidationError("activities requis pour la décennale", "MISSING_FIELD")
  }
}

export function validateDoQuote(data: InsuranceData): void {
  validateBaseInsuranceData(data, "do")
  assertRequiredString(data.projectName, "projectName")
  assertRequiredString(data.projectAddress, "projectAddress")
}

export function validateCertificateData(data: InsuranceCertificateData): void {
  validateBaseInsuranceData(data, data.productType)
  if (!data.paymentConfirmed || !data.insurerValidated) {
    throw new PdfValidationError(
      "Attestation refusée : paiement non confirmé ou risque non validé par l’assureur.",
      "CERTIFICATE_BLOCKED"
    )
  }
  if (data.productType === "decennale" && (!data.activities || data.activities.length === 0)) {
    throw new PdfValidationError("activities requis pour l’attestation décennale", "MISSING_FIELD")
  }
  if (data.productType === "do") {
    assertRequiredString(data.projectName, "projectName")
    assertRequiredString(data.projectAddress, "projectAddress")
  }
}

export { PDF_PAGE, PDF_COLORS }
