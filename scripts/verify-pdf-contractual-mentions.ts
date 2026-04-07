import assert from "node:assert/strict"
// @ts-expect-error - pdf-parse n'expose pas de types fiables dans cet environnement
import pdfParse from "pdf-parse"
import { generateDecennaleQuotePolicyBundle } from "@/lib/pdf/decennale/generateQuotePolicyBundle"
import { generateDOQuotePolicyBundle } from "@/lib/pdf/do/generateQuotePolicyBundle"
import { renderContractPdf } from "@/lib/insurance-contract-pdf"
import type { InsuranceData } from "@/lib/pdf/types"
import type { InsuranceContract } from "@/lib/prisma-client"

type MentionCheck = {
  label: string
  regex: RegExp
}

const COMMON_MENTIONS: MentionCheck[] = [
  { label: "mention protection juridique", regex: /protection\s+juridique/i },
  { label: "montant protection juridique 20 000", regex: /20[\s\u00a0\u202f]*000/i },
  { label: "mention devoir de conseil", regex: /devoir\s+de\s+conseil/i },
]

function normalizeExtractedPdfText(input: string): string {
  return input
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
}

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const parsed = await pdfParse(Buffer.from(pdfBytes))
  return normalizeExtractedPdfText(parsed.text || "")
}

function assertMentions(text: string, sourceLabel: string, checks: MentionCheck[]): void {
  for (const check of checks) {
    assert.match(
      text,
      check.regex,
      `PDF "${sourceLabel}" invalide: ${check.label} absente.`
    )
  }
}

function sampleDecennaleData(): InsuranceData {
  return {
    productType: "decennale",
    clientName: "Entreprise Test Decennale",
    siret: "12345678901234",
    address: "10 rue de Test, 75001 Paris",
    activities: ["Maconnerie generale", "Couverture"],
    startDate: "01/01/2026",
    endDate: "31/12/2026",
    premium: 2400,
    contractNumber: "QA-DEC-0001",
    createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
  }
}

function sampleDoData(): InsuranceData {
  return {
    productType: "do",
    clientName: "Maitre Ouvrage Test",
    address: "5 avenue Chantier, 33000 Bordeaux",
    projectName: "Construction maison individuelle",
    projectAddress: "12 chemin des Artisans, 33000 Bordeaux",
    constructionNature: "Maison individuelle",
    startDate: "01/02/2026",
    endDate: "01/02/2027",
    premium: 5800,
    contractNumber: "QA-DO-0001",
    createdAt: new Date("2026-01-02T10:00:00.000Z").toISOString(),
  }
}

function sampleRcFabContract(): InsuranceContract {
  return {
    id: "qa-rcfab-1",
    userId: "qa-user-1",
    productType: "rc_fabriquant",
    contractNumber: "QA-RCFAB-0001",
    clientName: "Fabricant Test",
    siret: "12345678901234",
    address: "8 rue de l Industrie, 69000 Lyon",
    activitiesJson: JSON.stringify(["Fabrication d'equipements"]),
    exclusionsJson: JSON.stringify([]),
    projectName: null,
    projectAddress: null,
    constructionNature: null,
    premium: 3600,
    status: "pending",
    validFrom: null,
    validUntil: null,
    paidAt: null,
    insurerValidatedAt: null,
    riskScore: null,
    rejectedReason: null,
    createdAt: new Date("2026-01-03T10:00:00.000Z"),
    updatedAt: new Date("2026-01-03T10:00:00.000Z"),
    molliePaymentId: null,
    paymentStatus: null,
    signedQuoteStorageKey: null,
    reminderSentAt: null,
    reminderAt: null,
  } as unknown as InsuranceContract
}

async function main(): Promise<void> {
  const decQuotePolicyPdf = await generateDecennaleQuotePolicyBundle(sampleDecennaleData(), "proposition")
  const doQuotePolicyPdf = await generateDOQuotePolicyBundle(sampleDoData(), "proposition")
  const rcFabPolicyPdf = await renderContractPdf(sampleRcFabContract(), "policy")

  const decText = await extractPdfText(decQuotePolicyPdf)
  const doText = await extractPdfText(doQuotePolicyPdf)
  const rcFabText = await extractPdfText(rcFabPolicyPdf)

  assertMentions(decText, "devis+conditions particulières décennale", COMMON_MENTIONS)
  assertMentions(doText, "devis+conditions particulières dommage-ouvrage", COMMON_MENTIONS)
  assertMentions(rcFabText, "conditions RC Fabriquant", COMMON_MENTIONS)

  console.log("OK: Mentions contractuelles PDF conformes (devoir de conseil + protection juridique).")
}

main().catch((error) => {
  console.error("Echec vérification mentions PDF:", error)
  process.exit(1)
})
