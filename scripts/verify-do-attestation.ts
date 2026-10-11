import assert from "node:assert/strict"
// @ts-expect-error - pdf-parse n'expose pas de types fiables dans cet environnement
import pdfParse from "pdf-parse"
import { generateDOCertificate } from "@/lib/pdf/do/generateCertificate"
import { generateDOQuotePolicyBundle } from "@/lib/pdf/do/generateQuotePolicyBundle"
import {
  constructionAddressFromLead,
  parseDoConstructionCost,
  readDoDocumentAttestation,
  resolveDoAttestationFacts,
} from "@/lib/do-attestation-facts"
import type { InsuranceCertificateData } from "@/lib/pdf/types"

function normalize(input: string): string {
  return input.replace(/\r/g, "\n").replace(/[ \t]+/g, " ")
}

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const parsed = await pdfParse(Buffer.from(pdfBytes))
  return normalize(parsed.text || "")
}

function sampleCertificate(constructionCost: number): InsuranceCertificateData {
  return {
    productType: "do",
    clientName: "SCA La Desirade",
    address: "14 rue du Siege, 49300 Cholet",
    projectName: "Immeuble logements",
    projectAddress: "5 rue du Chantier, 44000 Nantes",
    constructionNature: "Immeuble logements",
    constructionCost,
    startDate: "11/10/2026",
    endDate: "11/10/2036",
    premium: 8200,
    contractNumber: "QA-DO-ATT-0001",
    createdAt: new Date("2026-10-11T10:00:00.000Z").toISOString(),
    paymentConfirmed: true,
    insurerValidated: true,
  }
}

async function main(): Promise<void> {
  assert.equal(parseDoConstructionCost(["Coût construction : 513604"]), 513604)
  assert.equal(
    parseDoConstructionCost(["Coût prévisionnel de l'opération : 513 604 EUR"]),
    513604
  )
  assert.equal(parseDoConstructionCost(["Travaux y compris VRD privatifs : 100 000 EUR"]), null)

  const chantier = constructionAddressFromLead({
    adresse: "14 rue du Siege",
    codePostal: "49300",
    ville: "Cholet",
    adresseConstruction: "5 rue du Chantier",
    codePostalConstruction: "44000",
    villeConstruction: "Nantes",
  })
  assert.equal(chantier, "5 rue du Chantier, 44000 Nantes")

  const resolved = resolveDoAttestationFacts({
    projectAddress: "14 rue du Siege",
    activities: ["Coût prévisionnel de l'opération : 513 604 EUR"],
    companyAddress: "14 rue du Siege",
    companyPostalCode: "49300",
    companyCity: "Cholet",
    lead: {
      adresse: "14 rue du Siege",
      adresseConstruction: "5 rue du Chantier",
      codePostalConstruction: "44000",
      villeConstruction: "Nantes",
    },
    leadCoutTotal: 100,
  })
  assert.equal(resolved.constructionAddress, "5 rue du Chantier, 44000 Nantes")
  assert.equal(resolved.guaranteeAmount, 513604)

  const kept = resolveDoAttestationFacts({
    projectAddress: "8 impasse des Lilas, 35000 Rennes",
    companyAddress: "14 rue du Siege",
    lead: {
      adresseConstruction: "5 rue du Chantier",
      codePostalConstruction: "44000",
      villeConstruction: "Nantes",
    },
    leadCoutTotal: 420000,
  })
  assert.equal(kept.constructionAddress, "8 impasse des Lilas, 35000 Rennes")
  assert.equal(kept.guaranteeAmount, 420000)

  const documentFacts = readDoDocumentAttestation({
    adresse: "14 rue du Siege",
    adresseOperation: "14 rue du Siege",
    adresseConstruction: "5 rue du Chantier",
    codePostalConstruction: "44000",
    villeConstruction: "Nantes",
    coutTravauxVrd: 400000,
    coutMaitriseOeuvre: 20000,
  })
  assert.equal(documentFacts.constructionAddress, "5 rue du Chantier, 44000 Nantes")
  assert.equal(documentFacts.guaranteeAmount, 420000)

  const certificate = sampleCertificate(513604)
  const pdf = await generateDOCertificate(certificate)
  const text = await extractPdfText(pdf)
  assert.match(text, /Adresse de construction : 5 rue du Chantier, 44000 Nantes/)
  assert.match(text, /Montant des garanties : 513 604,00 EUR/)
  assert.doesNotMatch(text, /Montant des garanties : non renseign/)

  const quote = await generateDOQuotePolicyBundle(certificate, "proposition")
  const quoteText = await extractPdfText(quote)
  assert.match(quoteText, /Adresse de construction : 5 rue du Chantier, 44000 Nantes/)
  assert.match(quoteText, /Montant des garanties : 513 604,00 EUR/)

  console.log("verify-do-attestation: ok")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
