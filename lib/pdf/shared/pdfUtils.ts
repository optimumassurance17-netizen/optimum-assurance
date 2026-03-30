import type { PDFFont, PDFPage } from "pdf-lib"
import { PDF_COLORS, PDF_PAGE } from "./pdfLayout"
import { PdfValidationError } from "../errors"
import type { InsuranceCertificateData, InsuranceData, ProductType } from "../types"

export function formatEuro(n: number): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
  } catch {
    return iso
  }
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
  let y = startY
  for (const line of wrapLines(text, maxWidth, font, fontSize)) {
    page.drawText(line, { x, y, size: fontSize, font, color, maxWidth })
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
