/**
 * L'attestation décennale doit rester dans la page : le tampon ne recouvre pas
 * les clauses, et une longue liste d'activités n'est pas coupée sous le pied de page.
 */
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { DocumentsCombinedPDF } from "@/components/pdf/DocumentsCombinedPDF"
import { generateDecennaleCertificate } from "@/lib/pdf/decennale/generateCertificate"
import { PDF_PAGE } from "@/lib/pdf/shared/pdfLayout"
import type { InsuranceCertificateData } from "@/lib/pdf/types"

const require = createRequire(import.meta.url)
const pdfjs = require("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js") as {
  getDocument: (src: { data: Uint8Array; disableWorker?: boolean }) => {
    promise: Promise<{
      numPages: number
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str?: string; transform?: number[] }>
        }>
      }>
    }>
  }
}

type TextItem = { page: number; str: string; x: number; y: number }

const FOOTER_Y = 70

function sample(activities: string[]): InsuranceCertificateData {
  return {
    productType: "decennale",
    clientName: "Entreprise Test Décennale",
    siret: "12345678901234",
    address: "10 rue de Test, 75001 Paris",
    activities,
    startDate: "01/01/2026",
    endDate: "31/12/2026",
    premium: 2400,
    contractNumber: "QA-DEC-LAYOUT",
    createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
    paymentConfirmed: true,
    insurerValidated: true,
  }
}

async function readItems(bytes: Uint8Array): Promise<TextItem[]> {
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise
  const items: TextItem[] = []
  for (let page = 1; page <= doc.numPages; page += 1) {
    const content = await (await doc.getPage(page)).getTextContent()
    for (const item of content.items) {
      if (!item.str || !item.transform) continue
      items.push({ page, str: item.str, x: item.transform[4], y: item.transform[5] })
    }
  }
  return items
}

function assertLayout(items: TextItem[], activities: string[]) {
  const joined = items.map((item) => item.str).join(" ")
  for (const activity of activities) {
    assert.match(joined, new RegExp(activity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
  assert.match(joined, /Conditions d'effet/)
  assert.match(joined, /TAMPON ASSUREUR/)
  assert.match(joined, /RC Décennale obligatoire/)
  assert.match(joined, /Protection juridique/)

  const body = items.filter((item) => item.y >= FOOTER_Y && !/^Page \d+/.test(item.str))
  const tooLow = body.filter((item) => item.y < PDF_PAGE.marginBottom)
  assert.deepEqual(
    tooLow.map((item) => ({ page: item.page, y: Math.round(item.y), str: item.str })),
    [],
    "le texte de l'attestation entre dans le pied de page"
  )

  const signature = items.find((item) => item.str.includes("Signature autorisée"))
  assert.ok(signature, "signature absente")
  const stampBand = items.filter(
    (item) => item.page === signature.page && item.y <= signature.y + 2 && item.y >= PDF_PAGE.marginBottom
  )
  const overlapping = stampBand.filter((item) => item.x < signature.x - 8)
  assert.deepEqual(
    overlapping.map((item) => item.str),
    [],
    "le tampon recouvre le texte de l'attestation"
  )
}

async function main() {
  const shortActivities = ["Maçonnerie générale", "Couverture"]
  const longActivities = Array.from({ length: 14 }, (_, index) =>
    `Activité déclarée numéro ${index + 1} avec un libellé assez long pour passer à la ligne`
  )

  const shortPdf = await generateDecennaleCertificate(sample(shortActivities))
  const longPdf = await generateDecennaleCertificate(sample(longActivities))
  assertLayout(await readItems(shortPdf), shortActivities)
  assertLayout(await readItems(longPdf), longActivities)

  const clientPdf = await renderToBuffer(
    React.createElement(DocumentsCombinedPDF, {
      documents: [
        {
          id: "doc-attest",
          type: "attestation",
          numero: "ATT-CLIENT-1",
          data: {
            raisonSociale: "Entreprise Impression Test",
            siret: "12345678901234",
            adresse: "10 rue de Test",
            codePostal: "75001",
            ville: "Paris",
            activites: ["Maçonnerie générale"],
            primeAnnuelle: 2400,
            dateEffet: "01/01/2026",
            dateEcheance: "31/12/2026",
          },
        },
      ],
    }) as Parameters<typeof renderToBuffer>[0]
  )
  const clientText = (await readItems(new Uint8Array(clientPdf))).map((item) => item.str).join(" ")
  assert.match(clientText, /ATTESTATION/)
  assert.match(clientText, /Entreprise Impression Test/)
  assert.match(clientText, /Maçonnerie générale/)
  assert.match(clientText, /TAMPON ASSUREUR/)
  assert.doesNotMatch(clientText, /Métiers décennale|Imprimer \/ PDF|Espace client/)

  console.log("verify-decennale-certificate-layout: ok")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
