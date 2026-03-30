import { PDFDocument, StandardFonts } from "pdf-lib"
import type { InsuranceContract } from "@prisma/client"
import { generateDecennaleCertificate } from "@/lib/pdf/decennale/generateCertificate"
import { generateDecennalePolicy } from "@/lib/pdf/decennale/generatePolicy"
import { generateDecennaleQuote } from "@/lib/pdf/decennale/generateQuote"
import { generateDOCertificate } from "@/lib/pdf/do/generateCertificate"
import { generateDOPolicy } from "@/lib/pdf/do/generatePolicy"
import { generateDOQuote } from "@/lib/pdf/do/generateQuote"
import type { InsuranceCertificateData, InsuranceData } from "@/lib/pdf/types"
import {
  INVOICE_FIRST_SETTLEMENT_NOTE,
  INVOICE_PAYMENT_METHOD_PRIMARY,
  LEGAL_DELEGATION_MANDATORY,
  ORIAS_NUMBER,
} from "@/lib/legal-branding"
import { SITE_URL } from "@/lib/site-url"

function contractToInsuranceData(c: InsuranceContract): InsuranceData {
  const activities = c.activitiesJson ? (JSON.parse(c.activitiesJson) as string[]) : []
  const vf = c.validFrom ?? c.paidAt ?? c.createdAt
  const vu = c.validUntil ?? c.createdAt
  return {
    productType: c.productType === "do" ? "do" : "decennale",
    clientName: c.clientName,
    siret: c.siret ?? undefined,
    address: c.address,
    activities: activities.length ? activities : undefined,
    projectName: c.projectName ?? undefined,
    projectAddress: c.projectAddress ?? undefined,
    constructionNature: c.constructionNature ?? undefined,
    startDate: vf.toLocaleDateString("fr-FR"),
    endDate: vu.toLocaleDateString("fr-FR"),
    premium: c.premium,
    contractNumber: c.contractNumber,
    createdAt: c.createdAt.toISOString(),
  }
}

function toCertificateData(c: InsuranceContract): InsuranceCertificateData {
  const base = contractToInsuranceData(c)
  return {
    ...base,
    paymentConfirmed: !!c.paidAt,
    insurerValidated: !!c.insurerValidatedAt,
  }
}

async function generateSimpleInvoicePdf(c: InsuranceContract): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([595.28, 841.89])
  const y0 = 800
  let y = y0
  page.drawText("FACTURE ACQUITTÉE", { x: 50, y, size: 14, font: bold })
  y -= 28
  page.drawText(`Contrat ${c.contractNumber}`, { x: 50, y, size: 10, font })
  y -= 16
  page.drawText(`Produit : ${c.productType === "do" ? "Dommages-ouvrage" : "Décennale"}`, {
    x: 50,
    y,
    size: 10,
    font,
  })
  y -= 16
  page.drawText(`Client : ${c.clientName}`, { x: 50, y, size: 10, font })
  y -= 14
  page.drawText(`Montant TTC : ${c.premium.toLocaleString("fr-FR")} €`, { x: 50, y, size: 11, font: bold })
  y -= 18
  page.drawText(`Moyen de paiement : ${INVOICE_PAYMENT_METHOD_PRIMARY}`, { x: 50, y, size: 10, font })
  y -= 14
  page.drawText(INVOICE_FIRST_SETTLEMENT_NOTE, { x: 50, y, size: 9, font })
  y -= 14
  if (c.paidAt) {
    page.drawText(`Date de règlement : ${c.paidAt.toLocaleString("fr-FR")}`, { x: 50, y, size: 9, font })
    y -= 14
  }
  page.drawText(LEGAL_DELEGATION_MANDATORY, { x: 50, y: 76, size: 8, font: bold, maxWidth: 500 })
  page.drawText(`ORIAS ${ORIAS_NUMBER}`, { x: 50, y: 62, size: 8, font, maxWidth: 500 })
  page.drawText(`Références : ${SITE_URL}/cgv`, { x: 50, y: 46, size: 8, font })
  return pdf.save()
}

export type DocPdfType = "quote" | "policy" | "certificate" | "invoice"

export async function renderContractPdf(c: InsuranceContract, docType: DocPdfType): Promise<Uint8Array> {
  const data = contractToInsuranceData(c)
  if (docType === "invoice") {
    return generateSimpleInvoicePdf(c)
  }
  if (docType === "quote") {
    if (c.productType === "do") return generateDOQuote(data)
    return generateDecennaleQuote(data)
  }
  if (docType === "policy") {
    if (c.productType === "do") return generateDOPolicy(data)
    return generateDecennalePolicy(data)
  }
  if (docType === "certificate") {
    const cert = toCertificateData(c)
    if (!cert.paymentConfirmed || !cert.insurerValidated) {
      throw new Error("CERTIFICATE_NOT_ALLOWED")
    }
    if (c.productType === "do") return generateDOCertificate(cert)
    return generateDecennaleCertificate(cert)
  }
  throw new Error("UNKNOWN_DOC_TYPE")
}
