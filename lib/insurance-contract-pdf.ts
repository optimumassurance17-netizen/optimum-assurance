import { PDFDocument, StandardFonts } from "pdf-lib"
import type { InsuranceContract } from "@/lib/prisma-client"
import { createSupabaseServiceClient } from "@/lib/supabase"
import { ESIGN_BUCKET_SIGNED } from "@/lib/esign/buckets"
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
import { parseActivitiesJson, parseExclusionsJson } from "@/lib/insurance-contract-activities"
import { formatEuro } from "@/lib/pdf/shared/pdfUtils"
import { sanitizeForPdfLib } from "@/lib/pdf/shared/sanitizePdfText"

function contractToInsuranceData(c: InsuranceContract): InsuranceData {
  const activities = parseActivitiesJson(c.activitiesJson)
  const exclusions = parseExclusionsJson(c.exclusionsJson)
  const vf = c.validFrom ?? c.paidAt ?? c.createdAt
  const vu = c.validUntil ?? c.createdAt
  return {
    productType: c.productType === "do" ? "do" : "decennale",
    clientName: c.clientName,
    siret: c.siret ?? undefined,
    address: c.address,
    activities: activities.length ? activities : undefined,
    activityExclusions: exclusions.length ? exclusions : undefined,
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
  page.drawText(sanitizeForPdfLib("FACTURE ACQUITTÉE"), { x: 50, y, size: 14, font: bold })
  y -= 28
  page.drawText(sanitizeForPdfLib(`Contrat ${c.contractNumber}`), { x: 50, y, size: 10, font })
  y -= 16
  const produitLib =
    c.productType === "do"
      ? "Dommages-ouvrage"
      : c.productType === "rc_fabriquant"
        ? "RC Fabriquant (devis signé)"
        : "Décennale"
  page.drawText(sanitizeForPdfLib(`Produit : ${produitLib}`), {
    x: 50,
    y,
    size: 10,
    font,
  })
  y -= 16
  page.drawText(sanitizeForPdfLib(`Client : ${c.clientName}`), { x: 50, y, size: 10, font })
  y -= 14
  page.drawText(sanitizeForPdfLib(`Montant TTC : ${formatEuro(c.premium)}`), { x: 50, y, size: 11, font: bold })
  y -= 18
  page.drawText(sanitizeForPdfLib(`Moyen de paiement : ${INVOICE_PAYMENT_METHOD_PRIMARY}`), {
    x: 50,
    y,
    size: 10,
    font,
  })
  y -= 14
  page.drawText(sanitizeForPdfLib(INVOICE_FIRST_SETTLEMENT_NOTE), { x: 50, y, size: 9, font })
  y -= 14
  if (c.paidAt) {
    page.drawText(
      sanitizeForPdfLib(`Date de règlement : ${c.paidAt.toLocaleString("fr-FR")}`),
      { x: 50, y, size: 9, font }
    )
    y -= 14
  }
  page.drawText(sanitizeForPdfLib(LEGAL_DELEGATION_MANDATORY), {
    x: 50,
    y: 76,
    size: 8,
    font: bold,
    maxWidth: 500,
  })
  page.drawText(sanitizeForPdfLib(`ORIAS ${ORIAS_NUMBER}`), { x: 50, y: 62, size: 8, font, maxWidth: 500 })
  page.drawText(sanitizeForPdfLib(`Références : ${SITE_URL}/cgv`), { x: 50, y: 46, size: 8, font })
  return pdf.save()
}

export type DocPdfType = "quote" | "policy" | "certificate" | "invoice"

async function loadSignedQuotePdfBytes(storageKey: string): Promise<Uint8Array> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    throw new Error("Supabase non configuré — impossible de charger le devis signé.")
  }
  const { data, error } = await supabase.storage.from(ESIGN_BUCKET_SIGNED).download(storageKey)
  if (error || !data) {
    throw new Error("Fichier PDF signé introuvable ou expiré.")
  }
  return new Uint8Array(await data.arrayBuffer())
}

/** CP synthétique : le contrat détaillé est le PDF devis signé par le client. */
async function generateRcFabPolicyPlaceholderPdf(c: InsuranceContract): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([595.28, 841.89])
  let y = 780
  page.drawText(sanitizeForPdfLib("Conditions — RC Fabriquant"), { x: 50, y, size: 16, font: bold })
  y -= 28
  page.drawText(sanitizeForPdfLib(`Contrat ${c.contractNumber}`), { x: 50, y, size: 11, font: bold })
  y -= 20
  const p1 =
    "Les stipulations contractuelles applicables sont celles du document de proposition / devis que vous avez signé électroniquement. Ce document est disponible dans votre espace client sous « Devis PDF »."
  page.drawText(sanitizeForPdfLib(p1), { x: 50, y, size: 10, font, maxWidth: 500 })
  y -= 44
  page.drawText(sanitizeForPdfLib(`Prime convenue : ${formatEuro(c.premium)} TTC.`), { x: 50, y, size: 10, font })
  y -= 18
  page.drawText(sanitizeForPdfLib(`Assuré : ${c.clientName}`), { x: 50, y, size: 10, font })
  y -= 18
  page.drawText(sanitizeForPdfLib(`Siège / adresse déclarée : ${c.address}`), { x: 50, y, size: 10, font, maxWidth: 500 })
  y -= 36
  page.drawText(sanitizeForPdfLib(LEGAL_DELEGATION_MANDATORY), { x: 50, y: 72, size: 8, font: bold, maxWidth: 500 })
  page.drawText(sanitizeForPdfLib(`ORIAS ${ORIAS_NUMBER}`), { x: 50, y: 56, size: 8, font })
  return pdf.save()
}

/** Attestation courte après encaissement (complément au devis signé). */
async function generateRcFabAttestationPdf(c: InsuranceContract): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([595.28, 841.89])
  let y = 780
  page.drawText(sanitizeForPdfLib("ATTESTATION D’ASSURANCE"), { x: 50, y, size: 16, font: bold })
  y -= 28
  page.drawText(sanitizeForPdfLib("Responsabilité civile fabricant"), { x: 50, y, size: 12, font: bold })
  y -= 24
  page.drawText(sanitizeForPdfLib(`Contrat ${c.contractNumber}`), { x: 50, y, size: 10, font })
  y -= 18
  page.drawText(sanitizeForPdfLib(`Assuré : ${c.clientName}`), { x: 50, y, size: 10, font })
  y -= 16
  page.drawText(sanitizeForPdfLib(`Adresse : ${c.address}`), { x: 50, y, size: 10, font, maxWidth: 500 })
  y -= 28
  const vf = c.validFrom ?? c.paidAt ?? c.createdAt
  const vu = c.validUntil ?? c.createdAt
  page.drawText(
    sanitizeForPdfLib(
      `Garantie souscrite — effet au paiement enregistré. Période : du ${vf.toLocaleDateString("fr-FR")} au ${vu.toLocaleDateString("fr-FR")} (sous réserve des conditions du devis signé).`
    ),
    { x: 50, y, size: 10, font, maxWidth: 500 }
  )
  y -= 40
  page.drawText(sanitizeForPdfLib("Vérification : " + SITE_URL + "/verify/" + encodeURIComponent(c.contractNumber)), {
    x: 50,
    y,
    size: 9,
    font,
    maxWidth: 500,
  })
  y -= 36
  page.drawText(sanitizeForPdfLib(LEGAL_DELEGATION_MANDATORY), { x: 50, y: 72, size: 8, font: bold, maxWidth: 500 })
  return pdf.save()
}

export async function renderContractPdf(c: InsuranceContract, docType: DocPdfType): Promise<Uint8Array> {
  const data = contractToInsuranceData(c)
  if (docType === "invoice") {
    return generateSimpleInvoicePdf(c)
  }
  if (docType === "quote") {
    if (c.productType === "rc_fabriquant" && c.signedQuoteStorageKey?.trim()) {
      return loadSignedQuotePdfBytes(c.signedQuoteStorageKey.trim())
    }
    if (c.productType === "do") return generateDOQuote(data)
    return generateDecennaleQuote(data)
  }
  if (docType === "policy") {
    if (c.productType === "rc_fabriquant") return generateRcFabPolicyPlaceholderPdf(c)
    if (c.productType === "do") return generateDOPolicy(data)
    return generateDecennalePolicy(data)
  }
  if (docType === "certificate") {
    const cert = toCertificateData(c)
    if (!cert.paymentConfirmed || !cert.insurerValidated) {
      throw new Error("CERTIFICATE_NOT_ALLOWED")
    }
    if (c.productType === "rc_fabriquant") return generateRcFabAttestationPdf(c)
    if (c.productType === "do") return generateDOCertificate(cert)
    return generateDecennaleCertificate(cert)
  }
  throw new Error("UNKNOWN_DOC_TYPE")
}
